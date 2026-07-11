// Server functions powering the branded OTP flow (registration, login, reset).
// Client code calls these via useServerFn — see src/routes/auth*.tsx.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function loadServer() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { sendEmail } = await import("@/lib/email/send.server");
  const templates = await import("@/lib/email/templates");
  return { supabaseAdmin, sendEmail, templates };
}

// -------- REGISTRATION --------
export const startSignup = createServerFn({ method: "POST" })
  .inputValidator((raw) =>
    z.object({
      email: z.string().email(),
      password: z.string().min(8),
      fullName: z.string().min(1).max(120),
      phone: z.string().max(40).optional().default(""),
      currency: z.enum(["USD", "CAD", "VND", "BRL"]).default("USD"),
    }).parse(raw),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin, sendEmail, templates } = await loadServer();
    const email = data.email.toLowerCase().trim();

    // If an unverified stub exists, allow re-sending; otherwise create a fresh user (unconfirmed).
    const { data: existing } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
    const found = existing?.users?.find((u) => u.email?.toLowerCase() === email);
    let userId: string;
    if (found) {
      if (found.email_confirmed_at) throw new Error("An account with this email already exists. Please sign in.");
      userId = found.id;
      // update password + metadata in case they retry with different values
      await supabaseAdmin.auth.admin.updateUserById(found.id, {
        password: data.password,
        user_metadata: { full_name: data.fullName, phone: data.phone, currency: data.currency },
      });
    } else {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: data.password,
        email_confirm: false,
        user_metadata: { full_name: data.fullName, phone: data.phone, currency: data.currency },
      });
      if (error || !created.user) throw new Error(error?.message ?? "Could not create account.");
      userId = created.user.id;
    }

    const code = generateCode();
    const expires = new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString();
    await supabaseAdmin.from("email_otps").insert({
      email, user_id: userId, purpose: "signup", code, expires_at: expires,
    });
    const tpl = templates.otpEmail(code, "signup");
    await sendEmail({ to: email, subject: tpl.subject, html: tpl.html });
    return { ok: true };
  });

// -------- LOGIN --------
export const startLogin = createServerFn({ method: "POST" })
  .inputValidator((raw) => z.object({ email: z.string().email(), password: z.string().min(1) }).parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin, sendEmail, templates } = await loadServer();
    const { createClient } = await import("@supabase/supabase-js");
    const email = data.email.toLowerCase().trim();

    // Verify password server-side using a fresh anon client.
    const tmp = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const { data: signed, error } = await tmp.auth.signInWithPassword({ email, password: data.password });
    if (error || !signed.session) {
      if (error?.message?.toLowerCase().includes("email not confirmed")) {
        throw new Error("Please verify your email first. Check your inbox for the verification code.");
      }
      throw new Error("Invalid email or password.");
    }
    const session = signed.session;

    // Enforce account status
    const { data: acct } = await supabaseAdmin
      .from("accounts").select("status").eq("user_id", session.user.id).maybeSingle();
    if (acct?.status === "suspended") {
      throw new Error("Your account has been blocked. Please contact support to unlock it.");
    }

    const code = generateCode();
    const expires = new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString();
    await supabaseAdmin.from("email_otps").insert({
      email, user_id: session.user.id, purpose: "login", code, expires_at: expires,
      pending_session: { access_token: session.access_token, refresh_token: session.refresh_token },
    });
    const tpl = templates.otpEmail(code, "login");
    await sendEmail({ to: email, subject: tpl.subject, html: tpl.html });
    return { ok: true };
  });

// -------- PASSWORD RESET --------
export const startReset = createServerFn({ method: "POST" })
  .inputValidator((raw) => z.object({ email: z.string().email() }).parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin, sendEmail, templates } = await loadServer();
    const email = data.email.toLowerCase().trim();
    const { data: listed } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const u = listed?.users?.find((x) => x.email?.toLowerCase() === email);
    // Always respond with ok to avoid account enumeration, but only send when the user exists.
    if (u) {
      const code = generateCode();
      const expires = new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString();
      await supabaseAdmin.from("email_otps").insert({
        email, user_id: u.id, purpose: "reset", code, expires_at: expires,
      });
      const tpl = templates.otpEmail(code, "reset");
      await sendEmail({ to: email, subject: tpl.subject, html: tpl.html });
    }
    return { ok: true };
  });

// -------- VERIFY OTP --------
export const verifyOtp = createServerFn({ method: "POST" })
  .inputValidator((raw) =>
    z.object({
      email: z.string().email(),
      purpose: z.enum(["signup", "login", "reset"]),
      code: z.string().length(6),
      newPassword: z.string().min(8).optional(),
    }).parse(raw),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin, sendEmail, templates } = await loadServer();
    const { createClient } = await import("@supabase/supabase-js");
    const email = data.email.toLowerCase().trim();

    const { data: rows } = await supabaseAdmin
      .from("email_otps").select("*")
      .eq("email", email).eq("purpose", data.purpose).is("consumed_at", null)
      .order("created_at", { ascending: false }).limit(1);
    const row = rows?.[0];
    if (!row) throw new Error("No verification in progress. Please start again.");
    if (new Date(row.expires_at).getTime() < Date.now()) throw new Error("Code expired. Please request a new one.");
    if (row.attempts >= MAX_ATTEMPTS) throw new Error("Too many attempts. Please request a new code.");
    if (row.code !== data.code) {
      await supabaseAdmin.from("email_otps").update({ attempts: row.attempts + 1 }).eq("id", row.id);
      throw new Error("Incorrect code.");
    }
    await supabaseAdmin.from("email_otps").update({ consumed_at: new Date().toISOString() }).eq("id", row.id);

    if (data.purpose === "signup" && row.user_id) {
      await supabaseAdmin.auth.admin.updateUserById(row.user_id, { email_confirm: true });
      // Fetch user + password can't be recovered; use magiclink-based session issuance instead.
      const { data: link } = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email });
      const hashed_token = link?.properties?.hashed_token;
      if (!hashed_token) throw new Error("Could not create session.");
      const tmp = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
        auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      });
      const { data: verified, error } = await tmp.auth.verifyOtp({ token_hash: hashed_token, type: "magiclink" });
      if (error || !verified.session) throw new Error(error?.message ?? "Could not create session.");

      // Welcome email (best effort)
      const { data: profile } = await supabaseAdmin.from("profiles").select("full_name").eq("id", row.user_id).maybeSingle();
      try {
        const wtpl = templates.welcomeEmail(profile?.full_name ?? "there");
        await sendEmail({ to: email, subject: wtpl.subject, html: wtpl.html });
      } catch (e) { console.error("welcome email failed", e); }

      return { access_token: verified.session.access_token, refresh_token: verified.session.refresh_token };
    }

    if (data.purpose === "login") {
      const s = row.pending_session as { access_token: string; refresh_token: string } | null;
      if (!s) throw new Error("Session no longer available. Please sign in again.");
      return { access_token: s.access_token, refresh_token: s.refresh_token };
    }

    if (data.purpose === "reset") {
      if (!data.newPassword) return { ok: true, reset_verified: true }; // step 1 only
      if (!row.user_id) throw new Error("Account not found.");
      const { error } = await supabaseAdmin.auth.admin.updateUserById(row.user_id, { password: data.newPassword });
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    return { ok: true };
  });

export const resendOtp = createServerFn({ method: "POST" })
  .inputValidator((raw) => z.object({ email: z.string().email(), purpose: z.enum(["signup","login","reset"]) }).parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin, sendEmail, templates } = await loadServer();
    const email = data.email.toLowerCase().trim();
    const { data: rows } = await supabaseAdmin.from("email_otps").select("*")
      .eq("email", email).eq("purpose", data.purpose).is("consumed_at", null)
      .order("created_at", { ascending: false }).limit(1);
    const row = rows?.[0];
    if (!row) throw new Error("No verification in progress. Please start again.");
    const code = generateCode();
    const expires = new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString();
    await supabaseAdmin.from("email_otps").update({
      code, expires_at: expires, attempts: 0,
    }).eq("id", row.id);
    const tpl = templates.otpEmail(code, data.purpose);
    await sendEmail({ to: email, subject: tpl.subject, html: tpl.html });
    return { ok: true };
  });

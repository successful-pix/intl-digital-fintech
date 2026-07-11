// Branded HTML email templates for International Digital.
// Kept as plain strings so they render identically in every email client.

const BRAND = {
  name: "International Digital",
  color: "#3B82F6",
  bg: "#0B0B0F",
  card: "#16171D",
  text: "#E5E7EB",
  muted: "#94A3B8",
  domain: "internationaldigital.online",
};

function layout(title: string, inner: string, previewText = ""): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
${previewText ? `<div style="display:none;overflow:hidden;line-height:1;opacity:0;max-height:0;max-width:0">${escape(previewText)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 12px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(15,23,42,0.08);">
      <tr><td style="background:${BRAND.bg};padding:28px 32px;color:#fff;">
        <div style="display:inline-flex;align-items:center;gap:10px;">
          <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,${BRAND.color},#8b5cf6);display:inline-block;line-height:36px;text-align:center;color:#fff;font-weight:700;">ID</div>
          <div style="font-size:18px;font-weight:700;letter-spacing:-0.01em;">${BRAND.name}</div>
        </div>
      </td></tr>
      <tr><td style="padding:32px;">${inner}</td></tr>
      <tr><td style="padding:20px 32px;background:#f8fafc;color:#64748b;font-size:12px;line-height:1.6;border-top:1px solid #e2e8f0;">
        © ${new Date().getFullYear()} ${BRAND.name}. Bank-grade security for a modern world.<br>
        Support: <a href="mailto:support@${BRAND.domain}" style="color:${BRAND.color};text-decoration:none">support@${BRAND.domain}</a>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`;
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function btn(label: string, color = BRAND.color): string {
  return `<div style="display:inline-block;background:${color};color:#fff;font-weight:600;padding:12px 24px;border-radius:10px;">${escape(label)}</div>`;
}

export function otpEmail(code: string, purpose: "signup" | "login" | "reset"): { subject: string; html: string } {
  const titles = {
    signup: "Verify your email",
    login: "Your sign-in code",
    reset: "Reset your password",
  };
  const intros = {
    signup: "Welcome to International Digital. Enter the 6-digit code below to verify your email and activate your account.",
    login: "Someone (hopefully you) is trying to sign in to your International Digital account. Enter this code to continue.",
    reset: "Use this code to reset your International Digital password. If you didn't request this, you can safely ignore this email.",
  };
  const inner = `
    <h1 style="margin:0 0 8px;font-size:22px;color:#0f172a;">${titles[purpose]}</h1>
    <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6;">${intros[purpose]}</p>
    <div style="background:#f1f5f9;border:1px dashed #cbd5e1;border-radius:12px;padding:20px;text-align:center;margin:24px 0;">
      <div style="font-size:12px;color:#64748b;letter-spacing:.2em;text-transform:uppercase;">Your code</div>
      <div style="font-size:38px;letter-spacing:.35em;font-weight:700;color:${BRAND.color};margin-top:8px;font-family:'Menlo',monospace;">${escape(code)}</div>
      <div style="font-size:12px;color:#94a3b8;margin-top:8px;">Expires in 10 minutes</div>
    </div>
    <p style="margin:16px 0 0;color:#64748b;font-size:12px;line-height:1.5;">If you didn't request this code, no action is needed — your account is safe.</p>
  `;
  return { subject: `${titles[purpose]} — ${code}`, html: layout(titles[purpose], inner, `${titles[purpose]} — code ${code}`) };
}

export function welcomeEmail(name: string): { subject: string; html: string } {
  const inner = `
    <h1 style="margin:0 0 8px;font-size:22px;">Welcome to International Digital, ${escape(name)} 👋</h1>
    <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">Your account is active. You can now hold, send and receive USD, CAD, VND and BRL — all from one beautiful dashboard.</p>
    <p style="margin:24px 0;"><a href="https://${BRAND.domain}/dashboard" style="text-decoration:none;">${btn("Open your dashboard")}</a></p>
    <p style="margin:24px 0 0;color:#64748b;font-size:12px;">Need a hand? Reply to this email any time — we read every message.</p>
  `;
  return { subject: `Welcome to ${BRAND.name}`, html: layout("Welcome", inner, "Your account is active") };
}

export function transactionEmail(kind: "sent" | "received" | "updated", amount: string, currency: string, other: string, ref: string): { subject: string; html: string } {
  const title = kind === "sent" ? "Transfer sent" : kind === "received" ? "Funds received" : "Transaction update";
  const line = kind === "sent" ? `You sent <b>${escape(amount)} ${escape(currency)}</b> to ${escape(other)}.`
    : kind === "received" ? `You received <b>${escape(amount)} ${escape(currency)}</b> from ${escape(other)}.`
    : `Your transaction with ${escape(other)} was updated.`;
  const inner = `
    <h1 style="margin:0 0 8px;font-size:22px;">${title}</h1>
    <p style="margin:0 0 20px;color:#475569;font-size:14px;line-height:1.6;">${line}</p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;">
      <div style="font-size:12px;color:#64748b;">Reference</div>
      <div style="font-family:'Menlo',monospace;font-size:14px;color:#0f172a;">${escape(ref)}</div>
    </div>
    <p style="margin:24px 0;"><a href="https://${BRAND.domain}/transactions" style="text-decoration:none;">${btn("View in app")}</a></p>
  `;
  return { subject: `${title}: ${amount} ${currency}`, html: layout(title, inner) };
}

export function supportReplyEmail(preview: string): { subject: string; html: string } {
  const inner = `
    <h1 style="margin:0 0 8px;font-size:22px;">New reply from support</h1>
    <p style="margin:0 0 20px;color:#475569;font-size:14px;line-height:1.6;">Our team just replied to your conversation:</p>
    <blockquote style="margin:0 0 20px;padding:12px 16px;background:#f1f5f9;border-left:3px solid ${BRAND.color};border-radius:8px;color:#334155;font-size:14px;">${escape(preview)}</blockquote>
    <p style="margin:24px 0;"><a href="https://${BRAND.domain}/support" style="text-decoration:none;">${btn("Open conversation")}</a></p>
  `;
  return { subject: `New reply from ${BRAND.name} Support`, html: layout("Support reply", inner) };
}

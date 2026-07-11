// Server-only helper to send email via the Resend connector gateway.
// Do NOT import from client bundles — this file's *.server.ts suffix keeps it server-only.

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

const FROM_NAME = "International Digital";
const FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS ?? "support@internationaldigital.online";
const REPLY_TO = process.env.EMAIL_REPLY_TO ?? FROM_ADDRESS;

export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<void> {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
    throw new Error("Email is not configured (missing LOVABLE_API_KEY or RESEND_API_KEY).");
  }
  const res = await fetch(`${GATEWAY_URL}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": RESEND_API_KEY,
    },
    body: JSON.stringify({
      from: `${FROM_NAME} <${FROM_ADDRESS}>`,
      to: [opts.to],
      reply_to: REPLY_TO,
      subject: opts.subject,
      html: opts.html,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[email] Resend failed [${res.status}]: ${body}`);
    throw new Error(`Failed to send email (${res.status})`);
  }
}

// Server-only email sender for International Digital.
// Uses Resend directly from the Vercel server environment.
// NEVER expose RESEND_API_KEY to client-side code.

const FROM_NAME = "International Digital";

const FROM_ADDRESS =
  process.env.EMAIL_FROM_ADDRESS ?? "support@internationaldigital.online";

const REPLY_TO =
  process.env.EMAIL_REPLY_TO ?? FROM_ADDRESS;

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!RESEND_API_KEY) {
    console.error("[email] RESEND_API_KEY is missing");
    throw new Error(
      "Email service is not configured. Please contact support."
    );
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },

    body: JSON.stringify({
      from: `${FROM_NAME} <${FROM_ADDRESS}>`,
      to: [opts.to],
      reply_to: REPLY_TO,
      subject: opts.subject,
      html: opts.html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();

    console.error(
      `[email] Resend failed [${response.status}]: ${body}`
    );

    throw new Error(
      "Unable to send verification email. Please try again."
    );
  }

  console.log(`[email] Verification email sent to ${opts.to}`);
}

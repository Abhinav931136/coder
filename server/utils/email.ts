import nodemailer from "nodemailer";

export async function sendMail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const SMTP_HOST = process.env.SMTP_HOST || "";
  const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
  const SMTP_USER = process.env.SMTP_USER || "";
  const SMTP_PASS = process.env.SMTP_PASS || "";
  const SMTP_FROM_EMAIL = process.env.SMTP_FROM_EMAIL || SMTP_USER;
  const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || "InternDesire";

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error("SMTP not configured");
  }
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  await transporter.verify().catch(() => {});
  await transporter.sendMail({
    from: { name: SMTP_FROM_NAME, address: SMTP_FROM_EMAIL },
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
}

export function verificationEmailTemplate(link: string) {
  return `
  <div style="font-family:Arial,sans-serif;line-height:1.6">
    <h2>Verify your email</h2>
    <p>Thanks for signing up for InternDesire. Please confirm your email by clicking the button below:</p>
    <p>
      <a href="${link}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px">Verify Email</a>
    </p>
    <p>If the button doesn't work, copy and paste this URL into your browser:</p>
    <p>${link}</p>
  </div>`;
}

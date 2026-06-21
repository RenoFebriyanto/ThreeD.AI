// lib/email.ts
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM || "StockAI <onboarding@resend.dev>";

/**
 * Sends the password-reset email. If RESEND_API_KEY isn't configured (e.g.
 * local development), falls back to logging the reset link to the server
 * console so the flow can still be tested end-to-end without setting up an
 * email provider.
 */
export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  if (!resend) {
    console.warn(
      `[email] RESEND_API_KEY belum diisi — link reset password untuk ${to}:\n${resetUrl}`
    );
    return;
  }

  await resend.emails.send({
    from: FROM,
    to,
    subject: "Reset password StockAI kamu",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #18181b;">
        <h2 style="margin-bottom: 8px;">Reset password</h2>
        <p style="color: #52525b; line-height: 1.6;">
          Klik tombol di bawah untuk mengatur ulang password akun StockAI kamu.
          Link ini berlaku selama 1 jam.
        </p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}"
             style="background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;
                    text-decoration:none;font-weight:600;display:inline-block;">
            Reset Password
          </a>
        </p>
        <p style="color:#a1a1aa;font-size:13px;line-height:1.6;">
          Kalau kamu tidak meminta ini, abaikan saja email ini — password kamu
          tidak akan berubah.
        </p>
      </div>
    `,
  });
}

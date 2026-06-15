import { Resend } from "resend";

const ADMIN_EMAIL = "apps@cocoroe.me";
const FROM_EMAIL = "Waggly <onboarding@resend.dev>";

/**
 * Send an HTML email to the admin.
 * Logs errors but does not throw — form submission should succeed
 * even if email delivery fails.
 */
export async function sendAdminEmail(
  subject: string,
  html: string
): Promise<void> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject,
      html,
    });
  } catch (error) {
    console.error("Failed to send admin email:", error);
  }
}

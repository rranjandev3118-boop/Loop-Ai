import { Resend } from "resend";

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== "production") {
      return { from: from ?? "LOOP <no-reply@example.com>" };
    }
    throw new Error("OTP_EMAIL_NOT_CONFIGURED");
  }
  return { client: new Resend(apiKey), from };
}

function mapResendError(error: { message: string; statusCode?: number | null }): never {
  console.error("Resend email error:", error.message);
  const message = error.message.toLowerCase();
  if (error.statusCode === 403 || message.includes("testing") || message.includes("verify a domain")) {
    throw new Error("OTP_EMAIL_TEST_MODE");
  }
  throw new Error("OTP_EMAIL_DELIVERY_FAILED");
}

export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  const resend = getResendClient();
  if (!resend.client) {
    console.info(`[OTP development fallback] ${to}: ${otp}`);
    return;
  }
  const result = await resend.client.emails.send({
    from: resend.from,
    to,
    subject: "Your LOOP verification code",
    text: `Your LOOP verification code is ${otp}. It expires in 10 minutes.`
  });
  if (result.error) mapResendError(result.error);
}

export async function sendInvitationEmail(to: string, inviteUrl: string, role: string): Promise<void> {
  const resend = getResendClient();
  if (!resend.client) {
    console.info(`[Invitation development fallback] ${to}: ${inviteUrl}`);
    return;
  }
  const result = await resend.client.emails.send({
    from: resend.from,
    to,
    subject: "You have been invited to LOOP",
    text: `You have been invited to join LOOP as a ${role.toLowerCase()}.\n\nOpen this link to accept the invitation:\n${inviteUrl}\n\nThis invitation expires in 7 days.`
  });
  if (result.error) mapResendError(result.error);
}

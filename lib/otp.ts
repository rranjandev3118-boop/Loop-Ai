import { createHash, randomInt } from "crypto";
import { db } from "@/lib/db";
import { sendOtpEmail } from "@/lib/email";
import { EmailOtpPurpose } from "@prisma/client";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_SENDS_PER_HOUR = 5;

export class OtpError extends Error {
  constructor(public readonly message: string, public readonly status: number) {
    super(message);
  }
}

function hashOtp(otp: string) {
  return createHash("sha256").update(`${otp}:${process.env.NEXTAUTH_SECRET ?? "development-secret"}`).digest("hex");
}

export async function issueOtp(email: string, purpose: EmailOtpPurpose) {
  const now = Date.now();
  const recent = await db.emailOtp.findMany({
    where: { email, purpose, createdAt: { gte: new Date(now - 60 * 60 * 1000) } },
    orderBy: { createdAt: "desc" },
    take: MAX_SENDS_PER_HOUR
  });
  if (recent.length >= MAX_SENDS_PER_HOUR) throw new OtpError("Too many verification emails. Try again later.", 429);
  if (recent[0] && now - recent[0].createdAt.getTime() < RESEND_COOLDOWN_MS) throw new OtpError("Please wait 60 seconds before requesting another code.", 429);

  const otp = String(randomInt(100000, 1000000));
  await db.emailOtp.deleteMany({ where: { email, purpose } });
  await db.emailOtp.create({ data: { email, purpose, otpHash: hashOtp(otp), expiresAt: new Date(now + OTP_TTL_MS) } });
  try {
    await sendOtpEmail(email, otp);
  } catch (error) {
    await db.emailOtp.deleteMany({ where: { email, purpose } });
    if (error instanceof Error && error.message === "OTP_EMAIL_TEST_MODE") throw new OtpError("Email delivery is limited in test mode.", 503);
    if (error instanceof Error && error.message === "OTP_EMAIL_NOT_CONFIGURED") throw new OtpError("Email verification is not configured for production.", 503);
    throw new OtpError("Unable to send the verification email.", 502);
  }
}

export async function verifyOtp(email: string, otp: string, purpose: EmailOtpPurpose) {
  const record = await db.emailOtp.findFirst({ where: { email, purpose }, orderBy: { createdAt: "desc" } });
  if (!record || record.expiresAt <= new Date()) throw new OtpError("Your verification code has expired. Request a new code.", 400);
  if (record.attempts >= MAX_ATTEMPTS) throw new OtpError("Too many incorrect codes. Request a new code.", 429);
  const expected = Buffer.from(record.otpHash, "hex");
  const actual = Buffer.from(hashOtp(otp), "hex");
  const valid = expected.length === actual.length && (await import("crypto")).timingSafeEqual(expected, actual);
  if (!valid) {
    const attempts = record.attempts + 1;
    await db.emailOtp.update({ where: { id: record.id }, data: { attempts } });
    if (attempts >= MAX_ATTEMPTS) await db.emailOtp.delete({ where: { id: record.id } });
    throw new OtpError(attempts >= MAX_ATTEMPTS ? "Too many incorrect codes. Request a new code." : "Invalid verification code.", attempts >= MAX_ATTEMPTS ? 429 : 400);
  }
  await db.emailOtp.delete({ where: { id: record.id } });
}

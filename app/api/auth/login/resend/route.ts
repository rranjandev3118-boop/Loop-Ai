import { NextResponse } from "next/server";
import { z } from "zod";
import { issueOtp, OtpError } from "@/lib/otp";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const schema = z.object({ email: z.string().trim().toLowerCase().email() });

export async function POST(request: Request) {
  try {
    const { email } = schema.parse(await request.json());
    const user = await db.user.findUnique({ where: { email }, select: { email: true, emailVerified: true } });
    if (!user || user.emailVerified || email.endsWith("@loop.demo")) return NextResponse.json({ sent: true });
    await issueOtp(email, "LOGIN");
    return NextResponse.json({ sent: true });
  } catch (error) {
    if (error instanceof OtpError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    console.error("Login OTP resend failed", error);
    return NextResponse.json({ error: "Unable to resend the verification code." }, { status: 500 });
  }
}

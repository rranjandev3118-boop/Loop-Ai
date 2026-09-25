import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { issueOtp, OtpError } from "@/lib/otp";
import { enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
  targetRole: z.enum(["ADMIN", "ANALYST", "VIEWER"])
});

export async function POST(request: Request) {
  try {
    const payload = schema.parse(await request.json());
    if (!enforceRateLimit(`login-request:${payload.email}`, 10, 60_000)) return NextResponse.json({ error: "Too many login attempts" }, { status: 429 });
    const user = await db.user.findUnique({ where: { email: payload.email } });
    if (!user || user.disabledAt || user.role !== payload.targetRole || !(await bcrypt.compare(payload.password, user.passwordHash))) {
      return NextResponse.json({ error: "Invalid credentials or role mismatch." }, { status: 401 });
    }
    if (user.emailVerified || payload.email.endsWith("@loop.demo")) {
      return NextResponse.json({ verified: true });
    }
    await issueOtp(user.email, "LOGIN");
    return NextResponse.json({ requiresOtp: true, message: "Verification code sent successfully." }, { status: 202 });
  } catch (error) {
    if (error instanceof OtpError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid login details" }, { status: 400 });
    console.error("Login OTP request failed", error);
    return NextResponse.json({ error: "Unable to start sign in." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyOtp, OtpError } from "@/lib/otp";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  otp: z.string().regex(/^\d{6}$/),
  targetRole: z.enum(["ADMIN", "ANALYST", "VIEWER"])
});

export async function POST(request: Request) {
  try {
    const payload = schema.parse(await request.json());
    const user = await db.user.findUnique({ where: { email: payload.email } });
    if (!user || user.disabledAt || user.role !== payload.targetRole) return NextResponse.json({ error: "Invalid verification request." }, { status: 401 });
    await verifyOtp(user.email, payload.otp, "LOGIN");
    await db.user.updateMany({ where: { id: user.id, workspaceId: user.workspaceId }, data: { emailVerified: new Date() } });
    return NextResponse.json({ verified: true });
  } catch (error) {
    if (error instanceof OtpError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Enter a valid 6-digit verification code." }, { status: 400 });
    console.error("Login OTP verification failed", error);
    return NextResponse.json({ error: "Unable to verify the code." }, { status: 500 });
  }
}

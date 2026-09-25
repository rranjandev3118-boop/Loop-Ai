import { NextResponse } from "next/server";
import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { enforceRateLimit } from "@/lib/rate-limit";
import { issueOtp, verifyOtp, OtpError } from "@/lib/otp";

export const dynamic = "force-dynamic";

const signupSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128)
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[0-9]/, "Password must contain a number")
    .regex(/[^A-Za-z0-9]/, "Password must contain a special character"),
  workspace: z.string().trim().min(2).max(100).optional(),
  workspaceName: z.string().trim().min(2).max(100).optional(),
  inviteToken: z.string().trim().min(20).optional(),
  action: z.enum(["request", "verify"]).default("request"),
  otp: z.preprocess((value) => value === "" ? undefined : value, z.string().regex(/^\d{6}$/).optional())
}).refine((value) => Boolean(value.inviteToken) || Boolean(value.workspace || value.workspaceName), "Workspace name is required");

function inviteHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function errorResponse(error: unknown) {
  if (error instanceof OtpError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? "Please check the signup details" }, { status: 400 });
  if (error instanceof Error && error.message === "INVITATION_INVALID") return NextResponse.json({ error: "This invitation is invalid or expired" }, { status: 400 });
  console.error("Signup failed", error);
  return NextResponse.json({ error: "Could not complete signup" }, { status: 500 });
}

export async function POST(request: Request) {
  try {
    if (!enforceRateLimit(`signup:${request.headers.get("x-forwarded-for") ?? "unknown"}`, 10, 60_000)) {
      return NextResponse.json({ error: "Too many signup attempts" }, { status: 429 });
    }
    const payload = signupSchema.parse(await request.json());
    const email = payload.email;
    let user = await db.user.findUnique({ where: { email } });

    if (payload.action === "request") {
      if (user?.emailVerified) return NextResponse.json({ error: "Email already registered" }, { status: 409 });
      if (!user) {
        const created = await db.$transaction(async (tx) => {
          const invitation = payload.inviteToken
            ? await tx.invitation.findUnique({ where: { token: inviteHash(payload.inviteToken!) } })
            : null;
          if (payload.inviteToken && (!invitation || invitation.acceptedAt || invitation.revokedAt || invitation.expiresAt < new Date() || invitation.email !== email)) {
            throw new Error("INVITATION_INVALID");
          }
          const workspace = invitation
            ? await tx.workspace.findUniqueOrThrow({ where: { id: invitation.workspaceId } })
            : await tx.workspace.create({ data: { name: payload.workspaceName ?? payload.workspace! } });
          const newUser = await tx.user.create({
            data: {
              name: payload.name,
              email,
              passwordHash: await bcrypt.hash(payload.password, 12),
              role: invitation?.role ?? "ADMIN",
              workspaceId: workspace.id
            }
          });
          await tx.workspaceMember.create({ data: { workspaceId: workspace.id, userId: newUser.id, role: newUser.role, status: "ACTIVE" } });
          return newUser;
        });
        user = created;
      }
      await issueOtp(email, "SIGNUP");
      return NextResponse.json({ requiresOtp: true, message: "Verification code sent successfully." }, { status: 202 });
    }

    if (!user || user.emailVerified) return NextResponse.json({ error: "Signup verification is not available" }, { status: 400 });
    if (!payload.otp) return NextResponse.json({ error: "Enter the 6-digit verification code" }, { status: 400 });
    await verifyOtp(email, payload.otp, "SIGNUP");
    const verified = await db.$transaction(async (tx) => {
      const updated = await tx.user.update({ where: { id: user!.id }, data: { emailVerified: new Date() }, select: { id: true, role: true, workspaceId: true } });
      if (payload.inviteToken) {
        const invitation = await tx.invitation.findFirst({
          where: { token: inviteHash(payload.inviteToken), email, workspaceId: updated.workspaceId, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
          select: { id: true }
        });
        if (!invitation) throw new Error("INVITATION_INVALID");
        await tx.invitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } });
      }
      return updated;
    });
    return NextResponse.json({ verified: true, ...verified }, { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}

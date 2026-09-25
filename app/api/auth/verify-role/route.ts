import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";
import { enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  targetRole: z.enum(["ADMIN", "ANALYST", "VIEWER"])
});

export async function POST(request: Request) {
  try {
    if (!enforceRateLimit(`verify-role:${request.headers.get("x-forwarded-for") ?? "unknown"}`, 20, 60_000)) {
      return NextResponse.json({ success: false, error: "Too many verification attempts" }, { status: 429 });
    }
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }
    const { targetRole } = requestSchema.parse(await request.json());
    const currentUser = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, workspaceId: true, disabledAt: true }
    });
    if (!currentUser || currentUser.disabledAt) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }
    if (currentUser.role !== targetRole) {
      return NextResponse.json({
        success: false,
        error: `Your account has ${currentUser.role} access, not ${targetRole}. Please use the correct account.`
      }, { status: 403 });
    }

    const response = NextResponse.json({
      success: true,
      role: currentUser.role,
      workspaceId: currentUser.workspaceId
    });
    response.cookies.set({
      name: "loop_role_context",
      value: currentUser.role,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production"
    });
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: "Invalid role" }, { status: 400 });
    }
    console.error("Role verification error:", error);
    return NextResponse.json({ success: false, error: "Verification failed" }, { status: 500 });
  }
}

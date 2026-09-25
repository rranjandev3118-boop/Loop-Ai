import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { z } from "zod";

const requestSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
  targetRole: z.enum(["ADMIN", "ANALYST", "VIEWER"])
});

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { email, password, targetRole } = requestSchema.parse(await req.json());

    const sessionUser = session.user as typeof session.user & { id?: string; workspaceId?: string };
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true, role: true, workspaceId: true, disabledAt: true }
    });

    if (!user || user.disabledAt) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    if (!sessionUser.id || user.id !== sessionUser.id || user.workspaceId !== sessionUser.workspaceId) {
      return NextResponse.json({ error: "Role switching is limited to your active workspace" }, { status: 403 });
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const membership = await db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: user.workspaceId, userId: user.id } },
      select: { role: true, status: true }
    });
    if (!membership || membership.status !== "ACTIVE" || membership.role !== targetRole) {
      return NextResponse.json({
        error: `Your account has ${membership?.role ?? user.role} access, not ${targetRole}. Please use the correct account.`
      }, { status: 403 });
    }

    const response = NextResponse.json({
      success: true,
      role: membership.role,
      workspaceId: user.workspaceId
    });

    response.cookies.set({
      name: 'loop_role_context',
      value: user.role,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production'
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid role switch request" }, { status: 400 });
    }
    console.error('Role switch error:', error);
    return NextResponse.json({ error: 'Role switch failed' }, { status: 500 });
  }
}
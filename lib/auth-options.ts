import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "./db";
import bcrypt from "bcryptjs";
import { enforceRateLimit } from "./rate-limit";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [CredentialsProvider({
    name: "Credentials",
    credentials: { email: {}, password: {}, targetRole: {} },
    async authorize(credentials) {
      if (!credentials?.email || !credentials.password) return null;
      const normalizedEmail = credentials.email.trim().toLowerCase();
      if (!enforceRateLimit(`login:${normalizedEmail}`, 10, 60_000)) return null;

      const user = await db.user.findUnique({ where: { email: normalizedEmail } });
      if (!user || !(await bcrypt.compare(credentials.password, user.passwordHash))) return null;
      if (user.disabledAt) return null;
      if (!user.emailVerified && !normalizedEmail.endsWith("@loop.demo")) return null;

      const requestedRole = typeof credentials.targetRole === "string" ? credentials.targetRole : undefined;
      if (requestedRole && user.role !== requestedRole) return null;

      return { id: user.id, name: user.name, email: user.email, role: user.role, workspaceId: user.workspaceId };
    }
  })],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.workspaceId = user.workspaceId;
      }
      return token;
    },
    async session({ session, token }) {
      (session.user as any).id = token.id;
      (session.user as any).role = token.role;
      (session.user as any).workspaceId = token.workspaceId;
      return session;
    }
  },
  pages: { signIn: "/login" }
};

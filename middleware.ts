import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  // Route handlers return structured JSON and own their authorization. In
  // particular, health checks and cron jobs cannot carry a browser session.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login|signup|$).*)"]
};

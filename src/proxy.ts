import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookie";

/**
 * Optimistic gate: send visitors with no session cookie to /login before the
 * page renders. Pages and actions still verify the session themselves
 * (requireUser / requireAdmin), since a cookie can be stale or forged.
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/tasks/:path*",
    "/reports/:path*",
    "/events/:path*",
    "/categories/:path*",
    "/estimation/:path*",
    "/account/:path*",
    "/users/:path*",
  ],
};

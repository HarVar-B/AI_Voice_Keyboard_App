import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Lucia's default session cookie name (cannot import from lib/auth as it uses Prisma)
const SESSION_COOKIE_NAME = "auth_session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cookieHeader = request.headers.get("cookie") || "";

  // Check for session cookie existence
  // Actual validation happens in page components (Node.js runtime)
  const hasSessionCookie = cookieHeader.includes(`${SESSION_COOKIE_NAME}=`);

  // Allow access to login and signup pages
  if (pathname === "/login" || pathname === "/signup") {
    // If session cookie exists, redirect to home (user might be logged in)
    // Actual validation will happen in the page component
    if (hasSessionCookie) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // Protect all other routes - check for session cookie
  // If no cookie, redirect to login
  // Actual session validation happens in page components
  if (!hasSessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};


import { Lucia } from "lucia";
import { PrismaAdapter } from "@lucia-auth/adapter-prisma";
import { prisma } from "./prisma";
import { cookies } from "next/headers";

/**
 * Authentication Configuration
 * 
 * This module configures Lucia Auth for session-based authentication.
 * Sessions are stored in the database and managed via HTTP-only cookies.
 */

// Create Prisma adapter to connect Lucia with our database
const adapter = new PrismaAdapter(prisma.session, prisma.user);

/**
 * Lucia Auth instance
 * 
 * Configuration:
 * - Sessions stored in database (via PrismaAdapter)
 * - Session cookies never expire (expires: false)
 * - Cookies are secure (HTTPS only) in production
 * - User attributes exposed: email
 */
export const lucia = new Lucia(adapter, {
  sessionCookie: {
    expires: false, // Sessions persist until explicitly invalidated
    attributes: {
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
    },
  },
  getUserAttributes: (attributes) => {
    return {
      email: attributes.email,
    };
  },
});

/**
 * Session cookie name
 * 
 * Exported for use in middleware (edge runtime compatible).
 * Middleware runs in edge runtime and cannot import this module directly
 * due to Prisma dependencies, so we export the cookie name as a constant.
 */
export const SESSION_COOKIE_NAME = lucia.sessionCookieName;

/**
 * TypeScript type augmentation for Lucia
 * 
 * Extends Lucia's type system to include our user attributes (email).
 * This provides type safety when accessing user data from sessions.
 */
declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: {
      email: string;
    };
  }
}

/**
 * Validates the current request's session
 * 
 * This function is used in API routes and server components to check if
 * a user is authenticated. It reads the session cookie, validates it
 * against the database, and returns the user and session objects.
 * 
 * @returns Object containing:
 *   - user: User object if authenticated, null otherwise
 *   - session: Session object if valid, null otherwise
 * 
 * Usage in API routes:
 * ```typescript
 * const { user } = await validateRequest();
 * if (!user) {
 *   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 * }
 * ```
 * 
 * Session Management:
 * - Automatically refreshes session cookie if session is "fresh" (just validated)
 * - Clears cookie if session is invalid
 * - Handles Next.js rendering edge cases (cookies can't be set during SSR)
 */
export async function validateRequest() {
  const sessionId = (await cookies()).get(lucia.sessionCookieName)?.value ?? null;
  if (!sessionId) {
    return {
      user: null,
      session: null,
    };
  }

  const result = await lucia.validateSession(sessionId);
  try {
    // Refresh session cookie if session was just validated (fresh)
    if (result.session && result.session.fresh) {
      const sessionCookie = lucia.createSessionCookie(result.session.id);
      (await cookies()).set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
    }
    // Clear cookie if session is invalid
    if (!result.session) {
      const sessionCookie = lucia.createBlankSessionCookie();
      (await cookies()).set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
    }
  } catch {
    // Next.js throws error when attempting to set cookies during rendering
    // This is expected in some SSR scenarios, so we silently catch it
  }
  return result;
}

/**
 * Validates session from raw cookie header string
 * 
 * This function is designed for use in middleware, which runs in the edge
 * runtime and cannot use Next.js's `cookies()` helper (which requires
 * Node.js runtime). Instead, it manually parses the cookie header.
 * 
 * @param cookieHeader - Raw cookie header string from request (e.g., "cookie1=value1; cookie2=value2")
 * @returns Object containing user and session (same format as validateRequest)
 * 
 * Usage in middleware:
 * ```typescript
 * const cookieHeader = request.headers.get("cookie");
 * const { user } = await validateRequestFromCookies(cookieHeader);
 * ```
 * 
 * Note: This function does NOT set cookies (middleware can't modify response headers).
 * Cookie management is handled by the page/API route handlers.
 */
export async function validateRequestFromCookies(cookieHeader: string | null) {
  if (!cookieHeader) {
    return {
      user: null,
      session: null,
    };
  }

  // Parse cookie header into key-value pairs
  const cookies = Object.fromEntries(
    cookieHeader.split("; ").map((c) => {
      const [key, ...rest] = c.split("=");
      return [key, rest.join("=")];
    })
  );

  const sessionId = cookies[lucia.sessionCookieName] ?? null;
  if (!sessionId) {
    return {
      user: null,
      session: null,
    };
  }

  const result = await lucia.validateSession(sessionId);
  return result;
}


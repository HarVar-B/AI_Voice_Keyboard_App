import { NextRequest, NextResponse } from "next/server";
import { lucia, validateRequest } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { session } = await validateRequest();

    if (!session) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    await lucia.invalidateSession(session.id);

    const sessionCookie = lucia.createBlankSessionCookie();

    return NextResponse.json(
      { message: "Logout successful" },
      {
        status: 200,
        headers: {
          "Set-Cookie": sessionCookie.serialize(),
        },
      }
    );
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


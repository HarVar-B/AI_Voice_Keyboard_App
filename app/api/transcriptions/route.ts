import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * GET /api/transcriptions
 * 
 * Fetches all saved transcriptions for the authenticated user.
 * 
 * @param request - NextRequest (unused, but required by Next.js route handler)
 * @returns JSON response with array of transcriptions, ordered by creation date (newest first)
 * 
 * Returns:
 * - 200: Success with transcriptions array
 * - 401: Unauthorized (user not authenticated)
 * - 500: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    const { user } = await validateRequest();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const transcriptions = await prisma.transcription.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ transcriptions });
  } catch (error) {
    console.error("Error fetching transcriptions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/transcriptions
 * 
 * Saves a new transcription to the database for the authenticated user.
 * 
 * @param request - NextRequest containing JSON body with transcription content
 * @returns JSON response with the created transcription object
 * 
 * Request body:
 * - content: string (required) - The transcription text to save
 * 
 * Returns:
 * - 201: Success with created transcription object
 * - 400: Invalid or missing content
 * - 401: Unauthorized (user not authenticated)
 * - 500: Internal server error
 * 
 * The transcription is automatically associated with the authenticated user
 * and includes a timestamp of when it was created.
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await validateRequest();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { content } = await request.json();

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    const transcription = await prisma.transcription.create({
      data: {
        content: content.trim(),
        userId: user.id,
      },
    });

    return NextResponse.json({ transcription }, { status: 201 });
  } catch (error) {
    console.error("Error saving transcription:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


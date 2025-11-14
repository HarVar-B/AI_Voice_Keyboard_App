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
  const startTime = Date.now();
  const requestId = `get-transcriptions-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`[${requestId}] GET /api/transcriptions - Starting request`);
    
    const { user } = await validateRequest();

    if (!user) {
      console.log(`[${requestId}] Authentication failed - No user found`);
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log(`[${requestId}] User authenticated: ${user.email}`);

    const dbStartTime = Date.now();
    const transcriptions = await prisma.transcription.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    const dbDuration = Date.now() - dbStartTime;

    console.log(`[${requestId}] Fetched ${transcriptions.length} transcriptions in ${dbDuration}ms`);
    
    const totalDuration = Date.now() - startTime;
    console.log(`[${requestId}] Request completed successfully in ${totalDuration}ms`);

    return NextResponse.json({ transcriptions });
  } catch (error: any) {
    const totalDuration = Date.now() - startTime;
    console.error(`[${requestId}] Error fetching transcriptions after ${totalDuration}ms:`, {
      error: error.message,
      stack: error?.stack,
    });
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
  const startTime = Date.now();
  const requestId = `save-transcription-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`[${requestId}] POST /api/transcriptions - Starting save request`);
    
    const { user } = await validateRequest();

    if (!user) {
      console.log(`[${requestId}] Authentication failed - No user found`);
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log(`[${requestId}] User authenticated: ${user.email}`);

    const { content } = await request.json();

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      console.log(`[${requestId}] Error: Invalid or empty content provided`);
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    const contentLength = content.trim().length;
    console.log(`[${requestId}] Saving transcription with content length: ${contentLength} characters`);

    const dbStartTime = Date.now();
    const transcription = await prisma.transcription.create({
      data: {
        content: content.trim(),
        userId: user.id,
      },
    });
    const dbDuration = Date.now() - dbStartTime;

    console.log(`[${requestId}] Transcription saved with ID: ${transcription.id} in ${dbDuration}ms`);
    
    const totalDuration = Date.now() - startTime;
    console.log(`[${requestId}] Request completed successfully in ${totalDuration}ms`);

    return NextResponse.json({ transcription }, { status: 201 });
  } catch (error: any) {
    const totalDuration = Date.now() - startTime;
    console.error(`[${requestId}] Error saving transcription after ${totalDuration}ms:`, {
      error: error.message,
      stack: error?.stack,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


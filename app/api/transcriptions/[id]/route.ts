import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * DELETE /api/transcriptions/[id]
 * 
 * Deletes a specific transcription by ID.
 * 
 * @param request - NextRequest (unused, but required by Next.js route handler)
 * @param params - Route parameters containing the transcription ID
 * @param params.id - The unique identifier of the transcription to delete
 * @returns JSON response with success message
 * 
 * Returns:
 * - 200: Success with deletion confirmation
 * - 401: Unauthorized (user not authenticated)
 * - 403: Forbidden (transcription belongs to another user)
 * - 404: Transcription not found
 * - 500: Internal server error
 * 
 * Security:
 * - Verifies the transcription exists before attempting deletion
 * - Ensures the transcription belongs to the authenticated user
 * - Prevents users from deleting other users' transcriptions
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const requestId = `delete-transcription-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`[${requestId}] DELETE /api/transcriptions/[id] - Starting delete request`);
    
    const { user } = await validateRequest();

    if (!user) {
      console.log(`[${requestId}] Authentication failed - No user found`);
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log(`[${requestId}] User authenticated: ${user.email}`);

    const { id } = await params;
    console.log(`[${requestId}] Attempting to delete transcription with ID: ${id}`);

    // Verify the transcription belongs to the user
    const findStartTime = Date.now();
    const transcription = await prisma.transcription.findUnique({
      where: { id },
    });
    console.log(`[${requestId}] Transcription lookup completed in ${Date.now() - findStartTime}ms`);

    if (!transcription) {
      console.log(`[${requestId}] Transcription not found: ${id}`);
      return NextResponse.json(
        { error: "Transcription not found" },
        { status: 404 }
      );
    }

    if (transcription.userId !== user.id) {
      console.log(`[${requestId}] Unauthorized: Transcription belongs to different user`);
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const deleteStartTime = Date.now();
    await prisma.transcription.delete({
      where: { id },
    });
    const deleteDuration = Date.now() - deleteStartTime;

    console.log(`[${requestId}] Transcription deleted successfully in ${deleteDuration}ms`);
    
    const totalDuration = Date.now() - startTime;
    console.log(`[${requestId}] Request completed successfully in ${totalDuration}ms`);

    return NextResponse.json({ message: "Transcription deleted successfully" });
  } catch (error: any) {
    const totalDuration = Date.now() - startTime;
    console.error(`[${requestId}] Error deleting transcription after ${totalDuration}ms:`, {
      error: error.message,
      stack: error?.stack,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * DELETE /api/dictionary/[id]
 * 
 * Deletes a specific dictionary word by ID.
 * 
 * @param request - NextRequest (unused, but required by Next.js route handler)
 * @param params - Route parameters containing the word ID
 * @param params.id - The unique identifier of the dictionary word to delete
 * @returns JSON response with success message
 * 
 * Returns:
 * - 200: Success with deletion confirmation
 * - 401: Unauthorized (user not authenticated)
 * - 403: Forbidden (word belongs to another user)
 * - 404: Word not found
 * - 500: Internal server error
 * 
 * Security:
 * - Verifies the word exists before attempting deletion
 * - Ensures the word belongs to the authenticated user
 * - Prevents users from deleting other users' words
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const requestId = `delete-dictionary-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`[${requestId}] DELETE /api/dictionary/[id] - Starting delete request`);
    
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
    console.log(`[${requestId}] Attempting to delete dictionary word with ID: ${id}`);

    // Verify the word belongs to the user
    const findStartTime = Date.now();
    const word = await prisma.dictionaryWord.findUnique({
      where: { id },
    });
    console.log(`[${requestId}] Dictionary word lookup completed in ${Date.now() - findStartTime}ms`);

    if (!word) {
      console.log(`[${requestId}] Dictionary word not found: ${id}`);
      return NextResponse.json(
        { error: "Word not found" },
        { status: 404 }
      );
    }

    console.log(`[${requestId}] Found word: "${word.word}"`);

    if (word.userId !== user.id) {
      console.log(`[${requestId}] Unauthorized: Word belongs to different user`);
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const deleteStartTime = Date.now();
    await prisma.dictionaryWord.delete({
      where: { id },
    });
    const deleteDuration = Date.now() - deleteStartTime;

    console.log(`[${requestId}] Dictionary word deleted successfully in ${deleteDuration}ms`);
    
    const totalDuration = Date.now() - startTime;
    console.log(`[${requestId}] Request completed successfully in ${totalDuration}ms`);

    return NextResponse.json({ message: "Word deleted successfully" });
  } catch (error: any) {
    const totalDuration = Date.now() - startTime;
    console.error(`[${requestId}] Error deleting dictionary word after ${totalDuration}ms:`, {
      error: error.message,
      stack: error?.stack,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


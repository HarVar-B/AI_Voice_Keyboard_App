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
  try {
    const { user } = await validateRequest();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Verify the word belongs to the user
    const word = await prisma.dictionaryWord.findUnique({
      where: { id },
    });

    if (!word) {
      return NextResponse.json(
        { error: "Word not found" },
        { status: 404 }
      );
    }

    if (word.userId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    await prisma.dictionaryWord.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Word deleted successfully" });
  } catch (error) {
    console.error("Error deleting dictionary word:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


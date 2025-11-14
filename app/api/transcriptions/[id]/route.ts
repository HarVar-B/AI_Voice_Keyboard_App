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
  try {
    const { user } = await validateRequest();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Verify the transcription belongs to the user
    const transcription = await prisma.transcription.findUnique({
      where: { id },
    });

    if (!transcription) {
      return NextResponse.json(
        { error: "Transcription not found" },
        { status: 404 }
      );
    }

    if (transcription.userId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    await prisma.transcription.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Transcription deleted successfully" });
  } catch (error) {
    console.error("Error deleting transcription:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


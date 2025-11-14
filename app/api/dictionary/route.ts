import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * GET /api/dictionary
 * 
 * Fetches all custom dictionary words for the authenticated user.
 * 
 * @param request - NextRequest (unused, but required by Next.js route handler)
 * @returns JSON response with array of dictionary words, ordered alphabetically
 * 
 * Returns:
 * - 200: Success with words array
 * - 401: Unauthorized (user not authenticated)
 * - 500: Internal server error
 * 
 * These words are used as prompts in the Whisper API to improve transcription
 * accuracy for user-specific terms (e.g., technical terms, brand names, proper nouns).
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

    const words = await prisma.dictionaryWord.findMany({
      where: { userId: user.id },
      orderBy: { word: "asc" },
    });

    return NextResponse.json({ words });
  } catch (error) {
    console.error("Error fetching dictionary words:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dictionary
 * 
 * Adds a new custom word to the user's dictionary.
 * 
 * @param request - NextRequest containing JSON body with word to add
 * @returns JSON response with the created dictionary word object
 * 
 * Request body:
 * - word: string (required) - The word to add to the dictionary
 * 
 * Returns:
 * - 201: Success with created word object
 * - 400: Invalid word, word already exists, or word is empty
 * - 401: Unauthorized (user not authenticated)
 * - 500: Internal server error
 * 
 * Validation:
 * - Word must be a non-empty string
 * - Word is trimmed of whitespace
 * - Duplicate words are prevented (case-sensitive check)
 * 
 * The word will be included in future transcription prompts to improve
 * accuracy for that specific term.
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

    const { word } = await request.json();

    if (!word || typeof word !== "string" || word.trim().length === 0) {
      return NextResponse.json(
        { error: "Word is required" },
        { status: 400 }
      );
    }

    const trimmedWord = word.trim();

    // Check if word already exists for this user
    const existingWord = await prisma.dictionaryWord.findFirst({
      where: {
        userId: user.id,
        word: trimmedWord,
      },
    });

    if (existingWord) {
      return NextResponse.json(
        { error: "Word already exists in your dictionary" },
        { status: 400 }
      );
    }

    const dictionaryWord = await prisma.dictionaryWord.create({
      data: {
        word: trimmedWord,
        userId: user.id,
      },
    });

    return NextResponse.json({ word: dictionaryWord }, { status: 201 });
  } catch (error) {
    console.error("Error adding dictionary word:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


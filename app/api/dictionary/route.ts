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
  const startTime = Date.now();
  const requestId = `get-dictionary-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`[${requestId}] GET /api/dictionary - Starting request`);
    
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
    const words = await prisma.dictionaryWord.findMany({
      where: { userId: user.id },
      orderBy: { word: "asc" },
    });
    const dbDuration = Date.now() - dbStartTime;

    console.log(`[${requestId}] Fetched ${words.length} dictionary words in ${dbDuration}ms`);
    
    const totalDuration = Date.now() - startTime;
    console.log(`[${requestId}] Request completed successfully in ${totalDuration}ms`);

    return NextResponse.json({ words });
  } catch (error: any) {
    const totalDuration = Date.now() - startTime;
    console.error(`[${requestId}] Error fetching dictionary words after ${totalDuration}ms:`, {
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
  const startTime = Date.now();
  const requestId = `add-dictionary-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`[${requestId}] POST /api/dictionary - Starting add word request`);
    
    const { user } = await validateRequest();

    if (!user) {
      console.log(`[${requestId}] Authentication failed - No user found`);
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log(`[${requestId}] User authenticated: ${user.email}`);

    const { word } = await request.json();

    if (!word || typeof word !== "string" || word.trim().length === 0) {
      console.log(`[${requestId}] Error: Invalid or empty word provided`);
      return NextResponse.json(
        { error: "Word is required" },
        { status: 400 }
      );
    }

    const trimmedWord = word.trim();
    console.log(`[${requestId}] Adding word: "${trimmedWord}"`);

    // Check if word already exists for this user
    const checkStartTime = Date.now();
    const existingWord = await prisma.dictionaryWord.findFirst({
      where: {
        userId: user.id,
        word: trimmedWord,
      },
    });
    console.log(`[${requestId}] Duplicate check completed in ${Date.now() - checkStartTime}ms`);

    if (existingWord) {
      console.log(`[${requestId}] Word already exists: "${trimmedWord}"`);
      return NextResponse.json(
        { error: "Word already exists in your dictionary" },
        { status: 400 }
      );
    }

    const createStartTime = Date.now();
    const dictionaryWord = await prisma.dictionaryWord.create({
      data: {
        word: trimmedWord,
        userId: user.id,
      },
    });
    const createDuration = Date.now() - createStartTime;

    console.log(`[${requestId}] Dictionary word created with ID: ${dictionaryWord.id} in ${createDuration}ms`);
    
    const totalDuration = Date.now() - startTime;
    console.log(`[${requestId}] Request completed successfully in ${totalDuration}ms`);

    return NextResponse.json({ word: dictionaryWord }, { status: 201 });
  } catch (error: any) {
    const totalDuration = Date.now() - startTime;
    console.error(`[${requestId}] Error adding dictionary word after ${totalDuration}ms:`, {
      error: error.message,
      stack: error?.stack,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


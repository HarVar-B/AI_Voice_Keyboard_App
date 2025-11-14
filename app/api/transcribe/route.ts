import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * POST /api/transcribe
 * 
 * Transcribes audio chunks using OpenAI's Whisper API.
 * 
 * This endpoint receives 5-second audio slices from the frontend and returns
 * the transcribed text. It integrates with the user's custom dictionary to
 * improve transcription accuracy for specific words (e.g., technical terms,
 * proper nouns, brand names).
 * 
 * @param request - NextRequest containing FormData with audio file
 * @returns JSON response with transcribed text or error message
 * 
 * Process:
 * 1. Validates user authentication
 * 2. Extracts audio file from FormData
 * 3. Fetches user's custom dictionary words from database
 * 4. Creates a prompt string with custom words for Whisper API
 * 5. Converts File to Buffer for OpenAI SDK compatibility
 * 6. Calls OpenAI Whisper API with audio and custom prompt
 * 7. Returns transcribed text
 * 
 * Error handling:
 * - 401: Unauthorized (user not authenticated)
 * - 400: No audio file provided
 * - 429: OpenAI API quota exceeded
 * - 401: Invalid OpenAI API key
 * - 500: Internal server error
 * 
 * Custom Dictionary Integration:
 * The custom words are passed as a prompt to Whisper, which helps the model
 * recognize and correctly spell user-specific terms (e.g., "ShadCN", "Next.js").
 * This is especially useful for technical terms, brand names, and proper nouns.
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

    // Get the audio file from FormData
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Fetch user's custom dictionary words
    const dictionaryWords = await prisma.dictionaryWord.findMany({
      where: { userId: user.id },
      select: { word: true },
    });

    // Create prompt with custom words
    const customWordsPrompt = dictionaryWords.length > 0
      ? `Use these spellings: ${dictionaryWords.map((d) => d.word).join(", ")}.`
      : "";

    // Convert File to a format OpenAI can use
    // OpenAI SDK accepts File, Blob, or a stream
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create a File object for OpenAI (works in Node.js 18+)
    // For compatibility, we'll use the File constructor with the buffer
    const file = new File([buffer], audioFile.name || "audio.webm", {
      type: audioFile.type || "audio/webm",
    });

    // Call Whisper API
    const transcription = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file: file,
      prompt: customWordsPrompt || undefined,
      language: "en", // Optional: specify language for better accuracy
    });

    return NextResponse.json({
      text: transcription.text,
    });
  } catch (error: any) {
    console.error("Transcription error:", error);
    
    // Handle OpenAI API errors
    if (error?.status === 429 || error?.code === "insufficient_quota") {
      return NextResponse.json(
        { 
          error: "OpenAI API quota exceeded. Please check your OpenAI account billing and plan details.",
          code: "QUOTA_EXCEEDED"
        },
        { status: 429 }
      );
    }

    if (error?.status === 401) {
      return NextResponse.json(
        { 
          error: "Invalid OpenAI API key. Please check your API key configuration.",
          code: "INVALID_API_KEY"
        },
        { status: 401 }
      );
    }

    if (error?.message) {
      return NextResponse.json(
        { error: error.message || "Transcription failed" },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * POST /api/post-process
 * 
 * Post-processes transcription text using OpenAI GPT to improve grammar,
 * punctuation, and accuracy. Uses the user's custom dictionary to ensure
 * technical terms are spelled correctly.
 * 
 * @param request - NextRequest containing JSON body with transcription text
 * @returns JSON response with improved text or original text if processing fails
 * 
 * Request body:
 * - text: string (required) - The transcription text to improve
 * 
 * Returns:
 * - 200: Success with improved text
 * - 400: Invalid or missing text
 * - 401: Unauthorized (user not authenticated)
 * - 500: Internal server error (falls back to original text)
 * 
 * If OpenAI API is not available or fails, returns the original text.
 * This ensures the app continues to work even without OpenAI subscription.
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

    const { text } = await request.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      // Return original text if no API key
      return NextResponse.json({
        text: text.trim(),
        improved: false,
      });
    }

    // Fetch user's custom dictionary words
    const dictionaryWords = await prisma.dictionaryWord.findMany({
      where: { userId: user.id },
      select: { word: true },
    });

    // Create prompt with custom words
    const dictionaryContext = dictionaryWords.length > 0
      ? `\n\nImportant: Use these exact spellings when they appear: ${dictionaryWords.map((d) => d.word).join(", ")}.`
      : "";

    const prompt = `Please improve the following transcription text. Fix grammar, punctuation, capitalization, and spelling errors. Make it more readable and natural while preserving the original meaning and technical terms.${dictionaryContext}

Transcription:
${text.trim()}

Improved text:`;

    // Call OpenAI GPT API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using mini for cost efficiency
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that improves transcription quality. Fix grammar, punctuation, and spelling while preserving the original meaning and technical terms.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent results
      max_tokens: Math.ceil(text.length * 1.5), // Allow some expansion
    });

    const improvedText = completion.choices[0]?.message?.content?.trim() || text.trim();

    return NextResponse.json({
      text: improvedText,
      improved: true,
    });
  } catch (error: any) {
    console.error("Post-processing error:", error);
    
    // Always return the original text if processing fails
    // This ensures the app continues to work without OpenAI
    try {
      const { text } = await request.json();
      return NextResponse.json({
        text: text?.trim() || "",
        improved: false,
        error: error.message || "Post-processing failed",
      });
    } catch {
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }
}


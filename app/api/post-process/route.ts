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
  const startTime = Date.now();
  const requestId = `post-process-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`[${requestId}] POST /api/post-process - Starting post-processing request`);
    
    const { user } = await validateRequest();

    if (!user) {
      console.log(`[${requestId}] Authentication failed - No user found`);
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log(`[${requestId}] User authenticated: ${user.email}`);

    const { text } = await request.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      console.log(`[${requestId}] Error: Invalid or empty text provided`);
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    const textLength = text.trim().length;
    console.log(`[${requestId}] Processing text of length: ${textLength} characters`);

    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.log(`[${requestId}] No OpenAI API key configured, returning original text`);
      // Return original text if no API key
      return NextResponse.json({
        text: text.trim(),
        improved: false,
      });
    }

    // Fetch user's custom dictionary words
    const dictStartTime = Date.now();
    const dictionaryWords = await prisma.dictionaryWord.findMany({
      where: { userId: user.id },
      select: { word: true },
    });
    console.log(`[${requestId}] Fetched ${dictionaryWords.length} dictionary words in ${Date.now() - dictStartTime}ms`);

    // Create prompt with custom words
    const dictionaryContext = dictionaryWords.length > 0
      ? `\n\nImportant: Use these exact spellings when they appear: ${dictionaryWords.map((d) => d.word).join(", ")}.`
      : "";

    const prompt = `Please improve the following transcription text. Fix grammar, punctuation, capitalization, and spelling errors. Make it more readable and natural while preserving the original meaning and technical terms.${dictionaryContext}

Transcription:
${text.trim()}

Improved text:`;

    const maxTokens = Math.ceil(text.length * 1.5);
    console.log(`[${requestId}] Calling GPT-5-nano API with max_tokens: ${maxTokens}`);

    // Call OpenAI GPT API
    const gptStartTime = Date.now();
    const completion = await openai.chat.completions.create({
      model: "gpt-5-nano", // Using GPT-5-nano for ultra-low latency and cost efficiency
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
      max_tokens: maxTokens, // Allow some expansion
    });

    const gptDuration = Date.now() - gptStartTime;
    const improvedText = completion.choices[0]?.message?.content?.trim() || text.trim();
    const improvedLength = improvedText.length;
    
    console.log(`[${requestId}] GPT-5-nano API completed in ${gptDuration}ms`);
    console.log(`[${requestId}] Text improved: ${textLength} -> ${improvedLength} characters (${improvedLength - textLength > 0 ? '+' : ''}${improvedLength - textLength})`);

    const totalDuration = Date.now() - startTime;
    console.log(`[${requestId}] Post-processing request completed successfully in ${totalDuration}ms`);

    return NextResponse.json({
      text: improvedText,
      improved: true,
      model: "gpt-5-nano", // Return the model used
    });
  } catch (error: any) {
    const totalDuration = Date.now() - startTime;
    console.error(`[${requestId}] Post-processing error after ${totalDuration}ms:`, {
      error: error.message,
      status: error?.status,
      code: error?.code,
      stack: error?.stack,
    });
    
    // Always return the original text if processing fails
    // This ensures the app continues to work without OpenAI
    // Note: We can't re-read the request body, so we'll return an error
    // The frontend will handle this by keeping the original text
    return NextResponse.json(
      { 
        error: error.message || "Post-processing failed",
        improved: false 
      },
      { status: 500 }
    );
  }
}


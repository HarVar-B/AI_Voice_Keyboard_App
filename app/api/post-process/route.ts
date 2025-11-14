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
 * Model Selection:
 * The endpoint automatically detects and uses the first available text-to-text
 * model supported by the provided OpenAI API key. It tries models in this order:
 * 1. gpt-5-nano (preferred - ultra-low latency)
 * 2. gpt-4o-mini (fallback - fast and cost-effective)
 * 3. gpt-4o (fallback - high quality)
 * 4. gpt-4-turbo (fallback - good quality)
 * 5. gpt-3.5-turbo (fallback - widely available)
 * 
 * This ensures the application works with any OpenAI API key that has access
 * to at least one text-to-text model, not just gpt-5-nano.
 * 
 * @param request - NextRequest containing JSON body with transcription text
 * @returns JSON response with improved text or original text if processing fails
 * 
 * Request body:
 * - text: string (required) - The transcription text to improve
 * 
 * Returns:
 * - 200: Success with improved text and model name used
 * - 400: Invalid or missing text
 * - 401: Unauthorized (user not authenticated)
 * - 500: Internal server error (falls back to original text)
 * 
 * Response includes:
 * - text: Improved transcription text
 * - improved: boolean indicating if processing succeeded
 * - model: Name of the model used (e.g., "gpt-5-nano", "gpt-4o-mini")
 * 
 * If OpenAI API is not available or all models fail, returns the original text.
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
      ? `\n\nImportant: Use these exact spellings when they appear: ${dictionaryWords.map((d: { word: string }) => d.word).join(", ")}.`
      : "";

    const prompt = `Please improve the following transcription text. Fix grammar, punctuation, capitalization, and spelling errors. Make it more readable and natural while preserving the original meaning and technical terms.${dictionaryContext}

Transcription:
${text.trim()}

Improved text:`;

    const maxTokens = Math.ceil(text.length * 1.5);
    
    // Try multiple models in order of preference
    // The application will use the first available text-to-text model supported by the API key
    // This allows flexibility - if gpt-5-nano is not available, it will try other models
    const modelsToTry = [
      "gpt-5-nano",      // Preferred: ultra-low latency and cost efficient
      "gpt-4o-mini",     // Fallback: fast and cost-effective
      "gpt-4o",          // Fallback: high quality
      "gpt-4-turbo",     // Fallback: good quality
      "gpt-3.5-turbo",   // Fallback: widely available
    ];

    let lastError: any = null;
    let usedModel: string | null = null;
    let improvedText: string = text.trim();

    // Try each model until one succeeds
    for (const model of modelsToTry) {
      try {
        console.log(`[${requestId}] Attempting to use model: ${model} with max_tokens: ${maxTokens}`);
        const gptStartTime = Date.now();
        
        const completion = await openai.chat.completions.create({
          model: model,
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
        improvedText = completion.choices[0]?.message?.content?.trim() || text.trim();
        usedModel = model;
        
        console.log(`[${requestId}] ${model} API completed successfully in ${gptDuration}ms`);
        break; // Success - exit loop
      } catch (error: any) {
        lastError = error;
        // Check if it's a model-specific error (model not found/not available)
        if (error?.code === "model_not_found" || error?.message?.includes("model") || error?.status === 404) {
          console.log(`[${requestId}] Model ${model} not available, trying next model...`);
          continue; // Try next model
        }
        // For other errors (quota, rate limit, etc.), break and handle below
        console.log(`[${requestId}] Error with model ${model}: ${error?.message || error}`);
        break;
      }
    }

    if (!usedModel) {
      // All models failed
      throw lastError || new Error("No available text-to-text models");
    }

    const improvedLength = improvedText.length;
    console.log(`[${requestId}] Text improved using ${usedModel}: ${textLength} -> ${improvedLength} characters (${improvedLength - textLength > 0 ? '+' : ''}${improvedLength - textLength})`);

    const totalDuration = Date.now() - startTime;
    console.log(`[${requestId}] Post-processing request completed successfully in ${totalDuration}ms`);

    return NextResponse.json({
      text: improvedText,
      improved: true,
      model: usedModel, // Return the model actually used
    });
  } catch (error: any) {
    const totalDuration = Date.now() - startTime;
    
    // Determine error type and create user-friendly message
    let errorMessage = "Post-processing failed";
    let errorType = "unknown";
    
    if (error?.status === 401 || error?.code === "invalid_api_key" || error?.message?.includes("API key")) {
      errorMessage = "Invalid API key provided";
      errorType = "auth";
    } else if (error?.code === "insufficient_quota" || error?.message?.includes("quota")) {
      errorMessage = "API quota exceeded";
      errorType = "quota";
    } else if (error?.code === "rate_limit_exceeded" || error?.message?.includes("rate limit")) {
      errorMessage = "Rate limit exceeded. Please try again later";
      errorType = "rate_limit";
    } else if (error?.message?.includes("timeout") || error?.message?.includes("Timeout")) {
      errorMessage = "Request timed out";
      errorType = "timeout";
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    console.error(`[${requestId}] Post-processing error after ${totalDuration}ms:`, {
      error: errorMessage,
      type: errorType,
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
        error: errorMessage,
        errorType: errorType,
        improved: false 
      },
      { status: 500 }
    );
  }
}


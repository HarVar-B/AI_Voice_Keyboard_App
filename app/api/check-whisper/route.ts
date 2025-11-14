import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth";
import OpenAI from "openai";

export const runtime = "nodejs";

/**
 * GET /api/check-whisper
 * 
 * Checks if the OpenAI API key can access the Whisper-1 model.
 * This is done by attempting a minimal transcription request.
 * 
 * @param request - NextRequest (unused, but required by Next.js route handler)
 * @returns JSON response indicating if Whisper-1 is accessible
 * 
 * Returns:
 * - 200: Success with availability status
 * - 401: Unauthorized (user not authenticated)
 * - 500: Internal server error
 * 
 * The check uses a minimal audio file to test API access without
 * consuming significant quota. If the API key is invalid or doesn't
 * have access to Whisper, returns available: false.
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `check-whisper-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`[${requestId}] GET /api/check-whisper - Starting Whisper availability check`);
    
    const { user } = await validateRequest();

    if (!user) {
      console.log(`[${requestId}] Authentication failed - No user found`);
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log(`[${requestId}] User authenticated: ${user.email}`);

    // Get client-provided API key from query parameter if available
    const { searchParams } = new URL(request.url);
    const clientApiKey = searchParams.get("openaiApiKey");
    
    // Use client-provided API key if available, otherwise fall back to server's key
    const apiKeyToUse = clientApiKey || process.env.OPENAI_API_KEY;
    
    if (!apiKeyToUse) {
      console.log(`[${requestId}] No OpenAI API key available (neither client nor server)`);
      return NextResponse.json({
        available: false,
        reason: "No API key configured",
      });
    }
    
    // Create OpenAI client with the appropriate API key
    const openai = new OpenAI({
      apiKey: apiKeyToUse,
    });
    
    console.log(`[${requestId}] Using ${clientApiKey ? 'client-provided' : 'server'} API key`);

    console.log(`[${requestId}] OpenAI API key found, creating test audio file`);

    // Create a minimal test audio file (silence WAV file)
    // This is a minimal valid WAV file header + 1 sample of silence
    const minimalWavBase64 = "UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
    const audioBuffer = Buffer.from(minimalWavBase64, "base64");

    // Create a File object for OpenAI
    const testFile = new File([audioBuffer], "test.wav", {
      type: "audio/wav",
    });

    try {
      console.log(`[${requestId}] Attempting to call Whisper API with test audio`);
      // Attempt to call Whisper API with minimal audio
      // This will fail quickly if the API key doesn't have access to Whisper-1
      // We use a timeout to avoid waiting too long
      const whisperStartTime = Date.now();
      const transcriptionPromise = openai.audio.transcriptions.create({
        model: "whisper-1",
        file: testFile,
        language: "en",
      });

      // Set a timeout of 5 seconds for the check
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Timeout")), 5000);
      });

      await Promise.race([transcriptionPromise, timeoutPromise]);
      const whisperDuration = Date.now() - whisperStartTime;

      // If we get here, Whisper-1 is accessible
      const totalDuration = Date.now() - startTime;
      console.log(`[${requestId}] Whisper-1 is available (check completed in ${whisperDuration}ms, total: ${totalDuration}ms)`);
      return NextResponse.json({
        available: true,
        model: "whisper-1",
      });
    } catch (error: any) {
      const checkDuration = Date.now() - startTime;
      console.log(`[${requestId}] Whisper API check failed after ${checkDuration}ms:`, {
        error: error.message,
        status: error?.status,
        code: error?.code,
      });
      
      // Check specific error codes
      if (error?.status === 401 || error?.code === "invalid_api_key") {
        console.log(`[${requestId}] Invalid API key detected`);
        return NextResponse.json({
          available: false,
          reason: "Invalid API key",
        });
      }

      if (error?.status === 429 || error?.code === "insufficient_quota") {
        // Quota exceeded, but API key is valid
        console.log(`[${requestId}] Quota exceeded but API key is valid`);
        return NextResponse.json({
          available: true,
          model: "whisper-1",
          warning: "Quota exceeded, but API key is valid",
        });
      }

      if (error?.message?.includes("model") || error?.message?.includes("whisper")) {
        console.log(`[${requestId}] Whisper-1 model not accessible`);
        return NextResponse.json({
          available: false,
          reason: "Whisper-1 model not accessible",
        });
      }

      // For other errors, assume not available
      console.log(`[${requestId}] Unknown error: ${error?.message || "Unknown error"}`);
      return NextResponse.json({
        available: false,
        reason: error?.message || "Unknown error",
      });
    }
  } catch (error: any) {
    const totalDuration = Date.now() - startTime;
    console.error(`[${requestId}] Error checking Whisper availability after ${totalDuration}ms:`, {
      error: error.message,
      stack: error?.stack,
    });
    return NextResponse.json(
      {
        available: false,
        reason: "Internal server error",
      },
      { status: 500 }
    );
  }
}


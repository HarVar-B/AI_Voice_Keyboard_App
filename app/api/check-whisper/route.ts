import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
  try {
    const { user } = await validateRequest();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        available: false,
        reason: "No API key configured",
      });
    }

    // Create a minimal test audio file (silence WAV file)
    // This is a minimal valid WAV file header + 1 sample of silence
    const minimalWavBase64 = "UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
    const audioBuffer = Buffer.from(minimalWavBase64, "base64");

    // Create a File object for OpenAI
    const testFile = new File([audioBuffer], "test.wav", {
      type: "audio/wav",
    });

    try {
      // Attempt to call Whisper API with minimal audio
      // This will fail quickly if the API key doesn't have access to Whisper-1
      // We use a timeout to avoid waiting too long
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

      // If we get here, Whisper-1 is accessible
      return NextResponse.json({
        available: true,
        model: "whisper-1",
      });
    } catch (error: any) {
      // Check specific error codes
      if (error?.status === 401 || error?.code === "invalid_api_key") {
        return NextResponse.json({
          available: false,
          reason: "Invalid API key",
        });
      }

      if (error?.status === 429 || error?.code === "insufficient_quota") {
        // Quota exceeded, but API key is valid
      return NextResponse.json({
          available: true,
          model: "whisper-1",
          warning: "Quota exceeded, but API key is valid",
        });
      }

      if (error?.message?.includes("model") || error?.message?.includes("whisper")) {
        return NextResponse.json({
          available: false,
          reason: "Whisper-1 model not accessible",
        });
      }

      // For other errors, assume not available
      return NextResponse.json({
        available: false,
        reason: error?.message || "Unknown error",
      });
    }
  } catch (error: any) {
    console.error("Error checking Whisper availability:", error);
    return NextResponse.json(
      {
        available: false,
        reason: "Internal server error",
      },
      { status: 500 }
    );
  }
}


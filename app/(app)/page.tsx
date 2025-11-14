"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, Square, Copy, Check, X, History, Trash2 } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Transcription {
  id: string;
  content: string;
  createdAt: string;
}

export default function DictationPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pendingTranscriptionsRef = useRef(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { showToast } = useToast();

  // Fetch transcriptions on mount
  useEffect(() => {
    fetchTranscriptions();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, []);

  /**
   * Fetches all saved transcriptions from the API and updates the history state.
   * Sets loading state during the fetch operation.
   */
  const fetchTranscriptions = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch("/api/transcriptions");
      if (response.ok) {
        const data = await response.json();
        setTranscriptions(data.transcriptions || []);
      }
    } catch (error) {
      console.error("Error fetching transcriptions:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  /**
   * Handles audio data chunks from MediaRecorder (fires every 5 seconds).
   * 
   * This function is called automatically by MediaRecorder when a 5-second audio slice
   * is available. It sends the audio blob to the transcription API and appends the
   * resulting text to the current transcript.
   * 
   * @param event - BlobEvent containing the audio data chunk (5-second slice)
   * 
   * Process:
   * 1. Increments pending transcriptions counter to track concurrent requests
   * 2. Creates FormData with the audio blob
   * 3. Sends POST request to /api/transcribe
   * 4. Appends transcribed text to the existing transcript with a space separator
   * 5. Decrements counter and updates transcribing state when complete
   * 
   * Error handling:
   * - Shows error toast if transcription fails
   * - Ensures counter is decremented even on error to prevent stuck states
   */
  const handleDataAvailable = async (event: BlobEvent) => {
    if (event.data.size > 0) {
      pendingTranscriptionsRef.current += 1;
      setIsTranscribing(true);
      try {
        const formData = new FormData();
        formData.append("audio", event.data, "audio.webm");

        const response = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || "Transcription failed";
          throw new Error(errorMessage);
        }

        const data = await response.json();
        const text = data.text;

        // Append to transcript
        setTranscript((prev) => {
          const newText = prev ? `${prev} ${text}` : text;
          return newText;
        });
      } catch (error) {
        console.error("Error transcribing audio:", error);
        const errorMessage = error instanceof Error 
          ? error.message 
          : "Error transcribing audio chunk";
        showToast(errorMessage, "error");
      } finally {
        pendingTranscriptionsRef.current -= 1;
        setIsTranscribing(pendingTranscriptionsRef.current > 0);
      }
    }
  };

  /**
   * Initiates audio recording using the browser's MediaRecorder API.
   * 
   * This function sets up the entire recording pipeline:
   * 1. Clears any previous transcript
   * 2. Requests microphone permission from the user
   * 3. Configures audio constraints (echo cancellation, noise suppression, auto gain)
   * 4. Creates a MediaRecorder instance with WebM audio format
   * 5. Configures event handlers for data chunks and errors
   * 6. Starts recording with 5-second slice intervals
   * 7. Initializes UI state and duration timer
   * 
   * The MediaRecorder will automatically fire `ondataavailable` events every 5 seconds,
   * which triggers `handleDataAvailable` to transcribe each audio chunk.
   * 
   * @throws {Error} Various errors can occur:
   * - NotAllowedError: User denied microphone permission
   * - NotFoundError: No microphone device found
   * - NotReadableError: Microphone already in use
   * - OverconstrainedError: Microphone doesn't support required settings
   * 
   * Browser compatibility:
   * - Requires modern browser with MediaRecorder API support
   * - Requires WebM audio format support
   * - Falls back gracefully with user-friendly error messages
   */
  const startRecording = useCallback(async () => {
    try {
      // Clear previous transcript
      setTranscript("");
      
      // Check if MediaRecorder is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast("Your browser doesn't support audio recording. Please use a modern browser.", "error");
        return;
      }

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      // Check if MediaRecorder is supported
      if (!MediaRecorder.isTypeSupported("audio/webm")) {
        showToast("Audio format not supported. Please use a different browser.", "error");
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      // Create MediaRecorder instance
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      mediaRecorderRef.current = mediaRecorder;

      // Set up event handler for data available (fires every 5 seconds)
      mediaRecorder.ondataavailable = handleDataAvailable;

      // Handle errors
      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        showToast("Recording error occurred. Please try again.", "error");
        stopRecording();
      };

      // Start recording with 5-second slices
      mediaRecorder.start(5000);

      setIsRecording(true);
      setRecordingDuration(0);
      
      // Dispatch event for recording indicator
      window.dispatchEvent(new CustomEvent("recording:start"));
      
      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev: number) => prev + 1);
      }, 1000);
    } catch (error: any) {
      console.error("Error accessing microphone:", error);
      
      let errorMessage = "Failed to access microphone.";
      
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        errorMessage = "Microphone permission denied. Please allow microphone access in your browser settings.";
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        errorMessage = "No microphone found. Please connect a microphone and try again.";
      } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
        errorMessage = "Microphone is already in use by another application.";
      } else if (error.name === "OverconstrainedError") {
        errorMessage = "Microphone doesn't support the required settings.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showToast(errorMessage, "error");
    }
  }, [showToast]);

  /**
   * Saves the current transcript to the database and adds it to the history.
   * 
   * This function is called after recording stops and all pending transcriptions
   * have completed. It persists the complete transcript to the database and
   * updates the UI to show it in the history section.
   * 
   * @returns Promise that resolves when the transcription is saved
   * 
   * Process:
   * 1. Validates that transcript is not empty
   * 2. Sends POST request to /api/transcriptions with transcript content
   * 3. Adds the saved transcription to the beginning of the history list
   * 4. Clears the current transcript
   * 5. Shows success toast notification
   * 
   * Error handling:
   * - Shows error toast if save fails
   * - Ensures saving state is reset even on error
   */
  const saveTranscription = useCallback(async () => {
    if (!transcript.trim()) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/transcriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: transcript }),
      });

      if (!response.ok) {
        throw new Error("Failed to save transcription");
      }

      const data = await response.json();
      setTranscriptions((prev) => [data.transcription, ...prev]);
      setTranscript("");
      showToast("Transcription saved!", "success");
    } catch (error) {
      console.error("Error saving transcription:", error);
      showToast("Failed to save transcription", "error");
    } finally {
      setIsSaving(false);
    }
  }, [transcript, showToast]);

  /**
   * Stops the current recording session and saves the complete transcript.
   * 
   * This function performs cleanup and finalization:
   * 1. Stops the MediaRecorder instance
   * 2. Stops all audio tracks to release microphone
   * 3. Clears the duration timer
   * 4. Updates UI state to reflect recording stopped
   * 5. Waits for any pending transcription requests to complete
   * 6. Automatically saves the complete transcript if not empty
   * 
   * The function uses a polling mechanism to wait for pending transcriptions
   * because multiple 5-second chunks may still be processing when stop is called.
   * This ensures the complete transcript is saved, not just what's been transcribed so far.
   * 
   * @returns Promise that resolves when all cleanup and saving is complete
   */
  const stopRecording = useCallback(async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
    
    // Dispatch event for recording indicator
    window.dispatchEvent(new CustomEvent("recording:stop"));
    
    // Stop duration timer
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    // Wait for any pending transcriptions to complete
    // Then save the complete transcript
    const waitForTranscriptions = async () => {
      while (pendingTranscriptionsRef.current > 0) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      
      // Save transcript if it's not empty
      if (transcript.trim().length > 0) {
        await saveTranscription();
      }
    };

    waitForTranscriptions();
  }, [transcript, saveTranscription]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        return;
      }

      // Spacebar to start/stop recording
      if (e.key === " ") {
        e.preventDefault();
        if (isRecording) {
          stopRecording();
        } else if (!isSaving && !isTranscribing) {
          startRecording();
        }
      }
      // Escape to stop recording
      if (e.key === "Escape" && isRecording) {
        e.preventDefault();
        stopRecording();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRecording, isSaving, isTranscribing, startRecording, stopRecording]);

  /**
   * Copies text to the clipboard and provides visual feedback.
   * 
   * @param text - The text content to copy to clipboard
   * @param id - The unique identifier of the transcription being copied (for UI feedback)
   */
  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      showToast("Copied to clipboard!", "success");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      showToast("Failed to copy", "error");
    }
  };

  /**
   * Formats a date string into a human-readable format.
   * 
   * @param dateString - ISO date string from the database
   * @returns Formatted date string (e.g., "Jan 15, 2024, 3:45 PM")
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  };

  /**
   * Formats seconds into a MM:SS duration string.
   * 
   * @param seconds - Total number of seconds
   * @returns Formatted duration string (e.g., "5:23" for 5 minutes 23 seconds)
   */
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  /**
   * Deletes a transcription from the database and updates the UI.
   * 
   * @param id - The unique identifier of the transcription to delete
   */
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transcription?")) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`/api/transcriptions/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || "Failed to delete transcription";
        showToast(errorMessage, "error");
        return;
      }

      setTranscriptions((prev) => prev.filter((t) => t.id !== id));
      showToast("Transcription deleted successfully!", "success");
    } catch (error) {
      console.error("Error deleting transcription:", error);
      showToast("Error deleting transcription", "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl p-4 sm:p-6 space-y-6 sm:space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Dictation</h1>
        <p className="text-muted-foreground">
          Start recording to transcribe your speech in real-time
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex justify-center relative">
          {isRecording && (
            <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
              <div className="h-24 w-24 rounded-full bg-destructive/20 animate-ping" />
              <div className="absolute h-20 w-20 rounded-full bg-destructive/10" />
            </div>
          )}
          {isRecording ? (
            <Button
              size="lg"
              className="h-20 w-20 rounded-full bg-destructive hover:bg-destructive/90 transition-all duration-200 relative z-10 shadow-xl shadow-destructive/30 cursor-pointer"
              onClick={stopRecording}
              aria-label="Stop recording"
              aria-pressed="true"
              aria-describedby="recording-status"
            >
              <Square className="h-8 w-8" aria-hidden="true" />
            </Button>
          ) : (
            <Button
              size="lg"
              className="h-20 w-20 rounded-full transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl cursor-pointer"
              onClick={startRecording}
              disabled={isSaving || isTranscribing}
              aria-label="Start recording"
              aria-pressed="false"
              aria-describedby="recording-status"
            >
              <Mic className="h-8 w-8" aria-hidden="true" />
            </Button>
          )}
        </div>
        <div className="text-center space-y-2">
          <p id="recording-status" className="text-sm font-medium" role="status" aria-live="polite" aria-atomic="true">
            {isRecording
              ? `Recording... ${formatDuration(recordingDuration)}`
              : isSaving
              ? "Saving transcription..."
              : isTranscribing
              ? "Processing..."
              : "Click to start recording"}
          </p>
          {isTranscribing && !isRecording && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground" role="status" aria-live="polite">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Transcribing audio...</span>
            </div>
          )}
          {isSaving && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground" role="status" aria-live="polite">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Saving to history...</span>
            </div>
          )}
          {isRecording && (
            <div className="space-y-1" role="region" aria-label="Recording instructions">
              <p className="text-xs text-muted-foreground">
                Audio is being transcribed every 5 seconds
              </p>
              <p className="text-xs text-muted-foreground">
                Press <kbd className="px-1.5 py-0.5 text-xs font-semibold text-foreground bg-muted border border-border rounded">Space</kbd> to stop or <kbd className="px-1.5 py-0.5 text-xs font-semibold text-foreground bg-muted border border-border rounded">Esc</kbd> to cancel
              </p>
            </div>
          )}
          {!isRecording && !isSaving && !isTranscribing && (
            <p className="text-xs text-muted-foreground">
              Press <kbd className="px-1.5 py-0.5 text-xs font-semibold text-foreground bg-muted border border-border rounded">Space</kbd> to start recording
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="transcription-textarea" className="text-sm font-medium">Transcription</label>
          {transcript && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm("Are you sure you want to clear the transcript?")) {
                    setTranscript("");
                    showToast("Transcript cleared", "info");
                  }
                }}
                className="h-7 text-xs"
                aria-label="Clear transcription"
              >
                <X className="h-3 w-3 mr-1" aria-hidden="true" />
                Clear
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(transcript);
                  showToast("Transcription copied!", "success");
                }}
                className="h-7 text-xs cursor-pointer"
                aria-label="Copy transcription to clipboard"
              >
                <Copy className="h-3 w-3 mr-1" aria-hidden="true" />
                Copy
              </Button>
            </div>
          )}
        </div>
        <Textarea
          id="transcription-textarea"
          readOnly
          value={transcript}
          placeholder="Your transcription will appear here..."
          className="min-h-[200px] resize-none transition-all duration-200 shadow-sm"
          aria-label="Transcription output"
          aria-readonly="true"
          aria-describedby="transcription-description"
        />
        <p id="transcription-description" className="sr-only">
          Real-time transcription of your speech. The text will update automatically as you speak.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">History</h2>
        {isLoadingHistory ? (
          <div className="flex items-center justify-center py-12" role="status" aria-live="polite" aria-busy="true">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">Loading history...</p>
            </div>
          </div>
        ) : transcriptions.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center" role="status" aria-live="polite">
            <div className="flex flex-col items-center gap-3">
              <History className="h-12 w-12 text-muted-foreground/50" aria-hidden="true" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  No transcriptions yet
                </p>
                <p className="text-sm text-muted-foreground">
                  Start recording to create your first transcription
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4" role="region" aria-label="Transcription history" aria-live="polite">
            {transcriptions.map((transcription) => (
              <Card key={transcription.id} className="transition-shadow shadow-sm hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-sm font-medium">
                        {formatDate(transcription.createdAt)}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(transcription.content, transcription.id)}
                        aria-label={`Copy transcription from ${formatDate(transcription.createdAt)}`}
                        className="shadow-sm hover:shadow-md cursor-pointer"
                      >
                        {copiedId === transcription.id ? (
                          <>
                            <Check className="h-4 w-4 mr-2" aria-hidden="true" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-2" aria-hidden="true" />
                            Copy
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(transcription.id)}
                        disabled={deletingId === transcription.id}
                        aria-label={`Delete transcription from ${formatDate(transcription.createdAt)}`}
                        aria-busy={deletingId === transcription.id}
                        className={deletingId === transcription.id ? "cursor-not-allowed" : "cursor-pointer"}
                      >
                        {deletingId === transcription.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{transcription.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

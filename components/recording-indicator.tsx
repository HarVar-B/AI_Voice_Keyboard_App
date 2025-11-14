"use client";

import { useEffect, useState } from "react";
import { Mic } from "lucide-react";
import { cn } from "@/lib/utils";

export default function RecordingIndicator() {
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    // Listen for custom events from the dictation page
    const handleRecordingStart = () => setIsRecording(true);
    const handleRecordingStop = () => setIsRecording(false);

    window.addEventListener("recording:start", handleRecordingStart);
    window.addEventListener("recording:stop", handleRecordingStop);

    return () => {
      window.removeEventListener("recording:start", handleRecordingStart);
      window.removeEventListener("recording:stop", handleRecordingStop);
    };
  }, []);

  if (!isRecording) return null;

  return (
    <div 
      className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive text-xs font-medium"
      role="status"
      aria-live="polite"
      aria-label="Recording indicator"
    >
      <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" aria-hidden="true" />
      <Mic className="h-3 w-3" aria-hidden="true" />
      <span>Recording</span>
    </div>
  );
}


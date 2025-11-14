"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { Loader2, Trash2, BookOpen } from "lucide-react";

interface DictionaryWord {
  id: string;
  word: string;
}

export default function DictionaryPage() {
  const [words, setWords] = useState<DictionaryWord[]>([]);
  const [wordInput, setWordInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { showToast } = useToast();

  // Fetch words on mount
  useEffect(() => {
    fetchWords();
  }, []);

  const fetchWords = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/dictionary");
      if (response.ok) {
        const data = await response.json();
        setWords(data.words || []);
      } else {
        showToast("Failed to load dictionary words", "error");
      }
    } catch (error) {
      console.error("Error fetching dictionary words:", error);
      showToast("Error loading dictionary words", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!wordInput.trim()) {
      showToast("Please enter a word", "error");
      return;
    }

    setIsAdding(true);
    try {
      const response = await fetch("/api/dictionary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ word: wordInput.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || "Failed to add word";
        showToast(errorMessage, "error");
        return;
      }

      const data = await response.json();
      setWords((prev) => [...prev, data.word].sort((a, b) => 
        a.word.localeCompare(b.word)
      ));
      setWordInput("");
      showToast("Word added successfully!", "success");
    } catch (error) {
      console.error("Error adding word:", error);
      showToast("Error adding word", "error");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this word?")) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`/api/dictionary/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || "Failed to delete word";
        showToast(errorMessage, "error");
        return;
      }

      setWords((prev) => prev.filter((word) => word.id !== id));
      showToast("Word deleted successfully!", "success");
    } catch (error) {
      console.error("Error deleting word:", error);
      showToast("Error deleting word", "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl p-4 sm:p-6 space-y-6 sm:space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Dictionary</h1>
        <p className="text-muted-foreground">
          Add custom words to improve transcription accuracy. These words will be
          used as prompts for the AI transcription model.
        </p>
      </div>

      <div className="space-y-4">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4" aria-label="Add dictionary word">
          <div className="flex-1 space-y-2">
            <Label htmlFor="word">Word</Label>
            <Input
              id="word"
              placeholder="e.g., ShadCN, Next.js, TypeScript"
              value={wordInput}
              onChange={(e) => setWordInput(e.target.value)}
              required
              disabled={isAdding}
              className="transition-all shadow-sm focus:shadow-md"
              aria-required="true"
              aria-invalid={wordInput.trim() === "" && wordInput.length > 0 ? "true" : "false"}
            />
          </div>
          <div className="flex items-end">
            <Button 
              type="submit" 
              disabled={isAdding} 
              className="w-full sm:w-auto shadow-sm hover:shadow-md cursor-pointer disabled:cursor-not-allowed"
              aria-label="Add word to dictionary"
              aria-busy={isAdding}
            >
              {isAdding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                  Adding...
                </>
              ) : (
                "Add Word"
              )}
            </Button>
          </div>
        </form>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Your Custom Words</h2>
        {isLoading ? (
          <div className="flex items-center justify-center py-8" role="status" aria-live="polite" aria-busy="true">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">Loading dictionary words</span>
          </div>
        ) : words.length === 0 ? (
          <div className="rounded-md border border-dashed p-12 text-center" role="status" aria-live="polite">
            <div className="flex flex-col items-center gap-3">
              <BookOpen className="h-12 w-12 text-muted-foreground/50" aria-hidden="true" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  No custom words yet
                </p>
                <p className="text-sm text-muted-foreground">
                  Add your first word above to improve transcription accuracy
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-md border shadow-sm" role="region" aria-label="Custom dictionary words" aria-live="polite">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Word</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {words.map((word) => (
                  <TableRow key={word.id}>
                    <TableCell className="font-medium">{word.word}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(word.id)}
                        disabled={deletingId === word.id}
                        aria-label={`Delete word ${word.word}`}
                        aria-busy={deletingId === word.id}
                        className={deletingId === word.id ? "cursor-not-allowed" : "cursor-pointer"}
                      >
                        {deletingId === word.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

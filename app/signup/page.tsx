"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Something went wrong");
        setIsLoading(false);
        return;
      }

      // Redirect to home page on success
      router.push("/");
      router.refresh();
    } catch (err) {
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle>Sign Up</CardTitle>
          <CardDescription>
            Create an account to get started with AI Voice Keyboard
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit} aria-label="Sign up form">
          <CardContent className="space-y-4">
            {error && (
              <div 
                className="rounded-md bg-destructive/15 p-3 text-sm text-destructive"
                role="alert"
                aria-live="assertive"
              >
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                required
                disabled={isLoading}
                className={`shadow-sm focus:shadow-md ${error && !email ? "border-destructive" : ""}`}
                aria-required="true"
                aria-invalid={error && !email ? "true" : "false"}
                aria-describedby={error && !email ? "email-error" : undefined}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                required
                minLength={8}
                disabled={isLoading}
                className={`shadow-sm focus:shadow-md ${error && password.length < 8 ? "border-destructive" : ""}`}
                aria-required="true"
                aria-invalid={password.length > 0 && password.length < 8 ? "true" : "false"}
                aria-describedby={password.length > 0 && password.length < 8 ? "password-help" : undefined}
              />
              {password && password.length < 8 && (
                <p id="password-help" className="text-xs text-muted-foreground">
                  Password must be at least 8 characters
                </p>
              )}
            </div>
          </CardContent>
          <br />
          <CardFooter className="flex flex-col space-y-4">
            <Button 
              type="submit" 
              className="w-full shadow-md hover:shadow-lg" 
              disabled={isLoading}
              aria-busy={isLoading}
            >
              {isLoading ? "Creating account..." : "Sign Up"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}


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

export default function LoginPage() {
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
      const response = await fetch("/api/login", {
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
          <CardTitle>Sign In</CardTitle>
          <CardDescription>
            Enter your credentials to access AI Voice Keyboard
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit} aria-label="Sign in form">
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
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                required
                disabled={isLoading}
                className={`shadow-sm focus:shadow-md ${error && !password ? "border-destructive" : ""}`}
                aria-required="true"
                aria-invalid={error && !password ? "true" : "false"}
                aria-describedby={error && !password ? "password-error" : undefined}
              />
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
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/signup" className="text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}


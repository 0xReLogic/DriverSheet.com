'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiGoogle } from "react-icons/si";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function AuthPage() {
  const [step, setStep] = useState<"signin" | "sheet">("signin");
  const [sheetUrl, setSheetUrl] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      // NextAuth will handle OAuth and redirect
      await signIn('google', { callbackUrl: '/dash' });
    } catch (error) {
      console.error('Sign in error:', error);
      setIsSigningIn(false);
    }
  };

  const handleSetupComplete = async () => {
    if (!sheetUrl) return;
    setIsSettingUp(true);
    
    // TODO: Extract sheet ID and save via backend API
    // const sheetId = extractSheetId(sheetUrl);
    // await updateUserSheet(sheetId);
    
    // For now redirect to dash
    window.location.href = "/dash";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 px-2 py-1 rounded-md">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <Card className="p-8">
          {step === "signin" ? (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-2">Welcome to DriverSheet</h1>
                <p className="text-muted-foreground">Sign in to get started</p>
              </div>

              <Button
                onClick={handleGoogleSignIn}
                variant="outline"
                className="w-full"
                disabled={isSigningIn}
              >
                {isSigningIn ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <SiGoogle className="mr-2 h-5 w-5" />
                    Continue with Google
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground mt-6">
                Start your 7-day free trial. No credit card required.
              </p>
            </>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-2">Connect Your Google Sheet</h1>
                <p className="text-muted-foreground">Enter your Google Sheet URL to sync your earnings</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="sheet-url">Google Sheet URL</Label>
                  <Input
                    id="sheet-url"
                    type="url"
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    className="mt-2"
                    disabled={isSettingUp}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Make sure your sheet has a tab named "Sheet1"
                  </p>
                </div>

                <div className="bg-accent/50 p-4 rounded-lg">
                  <p className="text-sm font-medium mb-1">Your forwarding address:</p>
                  <p className="text-sm text-muted-foreground font-mono">
                    user-ABC123@driversheet.com
                  </p>
                </div>

                <Button
                  onClick={handleSetupComplete}
                  className="w-full"
                  disabled={!sheetUrl || isSettingUp}
                >
                  {isSettingUp ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    "Complete Setup"
                  )}
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

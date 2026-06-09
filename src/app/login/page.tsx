"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import Image from "next/image";

export default function LoginPage() {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { setUser } = useAuth();

  async function handleGoogleSignIn() {
    setIsSigningIn(true);
    setError(null);
    const { signInWithGoogle } = await import("@/lib/native-auth");
    const result = await signInWithGoogle();
    if (result.error) {
      setError(result.error);
      setIsSigningIn(false);
      return;
    }
    setUser?.(result.user);
    router.replace("/");
  }

  async function handleAppleSignIn() {
    setIsSigningIn(true);
    setError(null);
    const { signInWithApple } = await import("@/lib/native-auth");
    const result = await signInWithApple();
    if (result.error) {
      setError(result.error);
      setIsSigningIn(false);
      return;
    }
    setUser?.(result.user);
    router.replace("/");
  }

  // Detect iOS for Apple Sign In button order (App Store requirement)
  let isIos = false;
  try {
    const { Capacitor } = require("@capacitor/core");
    isIos = Capacitor.getPlatform() === "ios";
  } catch {}

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-green-700 px-6">
      <Image
        src="/icons/waggly-logo.svg"
        alt="Waggly"
        width={180}
        height={55}
        className="mb-12 brightness-0 invert"
      />

      <div className="flex w-full max-w-xs flex-col gap-3">
        {isIos && (
          <button
            onClick={handleAppleSignIn}
            disabled={isSigningIn}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-black text-white font-medium disabled:opacity-50"
          >
            Appleでサインイン
          </button>
        )}

        <button
          onClick={handleGoogleSignIn}
          disabled={isSigningIn}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-white text-gray-800 font-medium shadow disabled:opacity-50"
        >
          Googleでサインイン
        </button>

        {!isIos && (
          <button
            onClick={handleAppleSignIn}
            disabled={isSigningIn}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-black text-white font-medium disabled:opacity-50"
          >
            Appleでサインイン
          </button>
        )}
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-200">{error}</p>
      )}

      {isSigningIn && (
        <p className="mt-4 text-sm text-green-200">サインイン中...</p>
      )}
    </div>
  );
}

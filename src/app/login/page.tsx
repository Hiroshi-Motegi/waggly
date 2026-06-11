"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import Image from "next/image";
import { Capacitor } from "@capacitor/core";

export default function LoginPage() {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { setUser } = useAuth();

  const isIos = Capacitor.getPlatform() === "ios";

  async function handleGoogleSignIn() {
    setIsSigningIn(true);
    setError(null);
    const { signInWithGoogle } = await import("@/lib/native-auth");
    const result = await signInWithGoogle();
    if (result.error === "__CONFLICT__") {
      window.location.href = "/auth/resolve-conflict";
      return;
    }
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
    if (result.error === "__CONFLICT__") {
      window.location.href = "/auth/resolve-conflict";
      return;
    }
    if (result.error) {
      setError(result.error);
      setIsSigningIn(false);
      return;
    }
    setUser?.(result.user);
    router.replace("/");
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-[#139847]">
      <img
        src="/images/home-bg.jpg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none"
      />

      <div className="relative z-10 flex flex-col items-center px-8 w-full max-w-sm">
        {/* Logo */}
        <Image
          src="/icons/waggly-logo.svg"
          alt="Waggly"
          width={200}
          height={61}
          className="brightness-0 invert"
          priority
        />

        {/* Tagline */}
        <p className="mt-3 text-base text-white/80 text-center">
          ゴルフギアの管理をこれ一つで
        </p>

        {/* Sign in buttons */}
        <div className="flex w-full flex-col gap-3 mt-12">
          {/* Google */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            className="flex h-12 w-full items-center justify-center gap-2.5 rounded-full bg-white text-gray-800 font-bold text-base shadow-lg disabled:opacity-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Googleでサインイン
          </button>

          {/* Apple (iOS only) */}
          {isIos && (
            <button
              onClick={handleAppleSignIn}
              disabled={isSigningIn}
              className="flex h-12 w-full items-center justify-center gap-2.5 rounded-full bg-black text-white font-bold text-base disabled:opacity-50"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              Appleでサインイン
            </button>
          )}
        </div>

        {/* Status messages */}
        {error && (
          <p className="mt-4 text-base text-red-200 text-center">{error}</p>
        )}
        {isSigningIn && (
          <p className="mt-4 text-base text-white/70">サインイン中...</p>
        )}

        {/* Footer */}
        <p className="mt-16 text-xs text-white/40 text-center">
          サインインすることで、利用規約とプライバシーポリシーに同意します
        </p>
      </div>
    </div>
  );
}

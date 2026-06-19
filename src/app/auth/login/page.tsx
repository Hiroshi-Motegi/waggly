"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { LoginButtons } from "@/components/home/login-buttons";

function LoginPageInner() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");

  useEffect(() => {
    if (redirect) {
      sessionStorage.setItem("login_redirect", redirect);
    }
  }, [redirect]);

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ minHeight: "100dvh" }}>
      <div className="flex flex-col items-center w-full max-w-screen-sm px-6">
        <Image src="/icons/waggly-logo-white.svg" alt="Waggly" width={151} height={46} priority />
        <div className="bg-black/30 px-8 py-6 rounded-xl mt-6 w-full">
          <p className="text-center text-base font-bold text-white mb-4">ログイン・新規登録<span className="inline-flex items-center bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full mx-1.5 -translate-y-px">無料</span>はこちらから</p>
          <LoginButtons />
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginPageInner /></Suspense>;
}

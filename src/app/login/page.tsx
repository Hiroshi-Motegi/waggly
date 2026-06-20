"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { LoginButtons } from "@/components/home/login-buttons";
import { PublicFooter } from "@/components/public-footer";

export default function LoginPage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const redirect = searchParams.get("redirect");
    if (redirect) {
      sessionStorage.setItem("login_redirect", redirect);
    }
  }, [searchParams]);

  return (
    <div className="flex flex-col items-center bg-black/20" style={{ minHeight: "100dvh" }}>
      <div className="flex flex-col items-center justify-center flex-1 w-full max-w-sm px-4">
        <Image src="/images/witb-waggly-text.png" alt="Waggly" width={130} height={42} priority className="mt-8" />
        <p className="mt-3 text-base text-white/80 text-center">
          ログイン・新規登録<span className="inline-flex items-center bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full mx-1.5 -translate-y-px">無料</span>はこちらから
        </p>

        <div className="w-full mt-12 bg-black/30 rounded-xl px-3 py-6">
          <LoginButtons />
        </div>

        <p className="mt-6 mb-12 text-xs text-white text-center">
          サインインすることで、利用規約とプライバシーポリシーに同意します
        </p>
      </div>

      <PublicFooter />
    </div>
  );
}

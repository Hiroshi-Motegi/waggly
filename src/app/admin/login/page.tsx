"use client";

import { useEffect } from "react";
import { LoginButtons } from "@/components/home/login-buttons";

export default function AdminLoginPage() {
  useEffect(() => {
    // Set redirect destination so after OAuth callback, user lands on /admin
    sessionStorage.setItem("login_redirect", "/admin");
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1a1a1a]">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-xl">
        <h1 className="text-center text-lg font-bold text-[#006728]">Waggly Admin</h1>
        <p className="mt-1 mb-6 text-center text-xs text-[#888]">管理者ログイン</p>

        <div className="rounded-xl bg-black/5 px-3 py-6">
          <LoginButtons />
        </div>

        <p className="mt-4 text-center text-[11px] text-[#aaa]">
          管理者権限のあるアカウントでログインしてください
        </p>
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { CheckCircle } from "lucide-react";

export default function ContactCompletePage() {
  const router = useRouter();

  useEffect(() => {
    const referrer = document.referrer;
    if (!referrer || !referrer.includes("/help/contact")) {
      router.replace("/help/contact");
    }
  }, [router]);

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2">
      <PageHeader title="お問い合わせ" variant="dark" />

      <div className="rounded-lg bg-white p-8 text-center space-y-4">
        <CheckCircle className="mx-auto h-12 w-12 text-[#006728]" />
        <h2 className="text-lg font-bold">お問い合わせを受け付けました</h2>
        <p className="text-base text-[#8b8b8b]">
          2〜3営業日以内にご連絡いたします。
        </p>
      </div>

      <div className="flex flex-col items-center gap-2 px-6 pt-4 pb-2">
        <button
          onClick={() => router.push("/")}
          className="w-full max-w-xs rounded-full bg-white py-2.5 text-base font-bold text-[#006728]"
        >
          トップへ戻る
        </button>
      </div>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { PublicPageLayout } from "@/components/layout/public-page-layout";
import { CheckCircle } from "lucide-react";

export default function ContactCompletePage() {
  const router = useRouter();

return (
    <PublicPageLayout title="お問い合わせ" backHref="/help">
      <div className="rounded-lg bg-white p-8 text-center space-y-4">
        <CheckCircle className="mx-auto h-12 w-12 text-[#006728]" />
        <h2 className="text-lg font-bold">お問い合わせを受け付けました</h2>
        <p className="text-base text-[#8b8b8b]">
          2〜3営業日以内にご連絡いたします。
        </p>
      </div>

      <div className="flex flex-col items-center gap-2 px-6 pt-4 pb-8">
        <button
          onClick={() => router.push("/")}
          className="w-full max-w-xs rounded-full bg-white py-2.5 text-base font-bold text-[#006728]"
        >
          トップへ戻る
        </button>
      </div>
    </PublicPageLayout>
  );
}

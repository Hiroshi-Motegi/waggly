"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PublicPageLayout } from "@/components/layout/public-page-layout";
import { validateForm, type ValidationSchema } from "@/lib/form-validation";
import { Turnstile } from "@marsidev/react-turnstile";

const REASONS = [
  { value: "inappropriate", label: "不適切なコンテンツ" },
  { value: "spam", label: "スパム" },
  { value: "harassment", label: "嫌がらせ" },
  { value: "other", label: "その他" },
];

const reportSchema: ValidationSchema = {
  reason: { required: "理由を選択してください" },
};

const inputClass =
  "w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]";

function ReportPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const username = searchParams.get("username") ?? "";

  const [form, setForm] = useState({
    reason: "",
    detail: "",
    reporter_email: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!username) {
    return (
      <PublicPageLayout title="通報">
        <div className="rounded-lg bg-white p-4 text-center">
          <p className="text-base text-[#8b8b8b]">通報対象が指定されていません。</p>
        </div>
      </PublicPageLayout>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const validationErrors = validateForm(form, reportSchema);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (!turnstileToken) {
      setSubmitError("認証を完了してください");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reported_username: username,
          ...form,
          turnstileToken,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setSubmitError(data.error ?? "送信に失敗しました");
        return;
      }

      router.push("/report/complete");
    } catch {
      setSubmitError("送信に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  return (
    <PublicPageLayout title="通報">
      <form onSubmit={handleSubmit} className="space-y-2">
        {/* 通報対象 */}
        <div className="flex flex-col gap-0.5 rounded-lg bg-white p-3">
          <span className="text-sm flex items-center">通報対象ユーザー</span>
          <p className="text-base font-bold">{username}</p>
        </div>

        {/* フォーム本体 */}
        <div className="flex flex-col gap-1 rounded-lg bg-white p-3">
          {/* 理由 */}
          <div className="flex flex-col gap-0.5 py-1">
            <span className="text-sm flex items-center">
              理由 <span className="ml-auto text-[10px] text-[#8b8b8b] border border-[#c4c4c4] rounded px-1 py-px">必須</span>
            </span>
            <select
              value={form.reason}
              onChange={(e) => updateField("reason", e.target.value)}
              className={inputClass}
            >
              <option value="">選択してください</option>
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            {errors.reason && <p className="text-sm text-red-500 mt-1">{errors.reason}</p>}
          </div>

          {/* 詳細 */}
          <div className="flex flex-col gap-0.5 py-1">
            <span className="text-sm flex items-center">
              詳細 <span className="ml-auto text-[10px] text-[#8b8b8b] border border-[#c4c4c4] rounded px-1 py-px">任意</span>
            </span>
            <textarea
              value={form.detail}
              onChange={(e) => updateField("detail", e.target.value)}
              className={`${inputClass} min-h-[100px] resize-y`}
              placeholder="具体的な内容があればご記入ください"
            />
          </div>

          {/* メールアドレス */}
          <div className="flex flex-col gap-0.5 py-1">
            <span className="text-sm flex items-center">
              メールアドレス <span className="ml-auto text-[10px] text-[#8b8b8b] border border-[#c4c4c4] rounded px-1 py-px">任意</span>
            </span>
            <input
              type="email"
              value={form.reporter_email}
              onChange={(e) => updateField("reporter_email", e.target.value)}
              className={inputClass}
              placeholder="対応結果の返信を希望する場合"
            />
          </div>

          {/* Turnstile */}
          <div className="flex justify-center py-3">
            <Turnstile
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
              onSuccess={setTurnstileToken}
            />
          </div>

          {/* エラー表示 */}
          {submitError && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
              {submitError}
            </div>
          )}
        </div>

        {/* 送信ボタン */}
        <div className="flex flex-col items-center gap-2 px-6 pt-4 pb-8">
          <button
            type="submit"
            disabled={submitting}
            className="w-full max-w-xs rounded-full bg-white py-2.5 text-base font-bold text-[#006728] disabled:opacity-50"
          >
            {submitting ? "送信中..." : "通報する"}
          </button>
        </div>
      </form>
    </PublicPageLayout>
  );
}

export default function ReportPage() {
  return <Suspense><ReportPageInner /></Suspense>;
}

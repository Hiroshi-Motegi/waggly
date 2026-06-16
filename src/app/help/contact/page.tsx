"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { useProfile } from "@/hooks/use-profile";
import { validateForm, type ValidationSchema } from "@/lib/form-validation";
import { Turnstile } from "@marsidev/react-turnstile";
import { Loader2 } from "lucide-react";

const CATEGORIES = [
  { value: "bug", label: "不具合" },
  { value: "feature", label: "機能要望" },
  { value: "question", label: "質問" },
  { value: "other", label: "その他" },
];

const contactSchema: ValidationSchema = {
  email: {
    required: "メールアドレスを入力してください",
    pattern: {
      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: "有効なメールアドレスを入力してください",
    },
  },
  category: { required: "カテゴリを選択してください" },
  message: {
    required: "お問い合わせ内容を入力してください",
    maxLength: { value: 2000, message: "2000文字以内で入力してください" },
  },
};

const nameSchema: ValidationSchema = {
  name: { required: "お名前を入力してください" },
};

const inputClass =
  "w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]";

export default function ContactPage() {
  const router = useRouter();
  const { profile } = useProfile();
  const isLoggedIn = !!profile;

  const [form, setForm] = useState({
    name: "",
    email: "",
    category: "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const schema = isLoggedIn ? contactSchema : { ...contactSchema, ...nameSchema };
    const validationErrors = validateForm(form, schema);
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
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          name: isLoggedIn ? null : form.name,
          turnstileToken,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setSubmitError(data.error ?? "送信に失敗しました");
        return;
      }

      router.push("/help/contact/complete");
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
    <div className="relative flex flex-col px-2 py-2 space-y-2">
      <PageHeader title="お問い合わせ" variant="dark" />

      <form onSubmit={handleSubmit}>
        <div className="rounded-lg bg-white p-4 space-y-4">
          {/* 名前 (未ログイン時) or ニックネーム表示 (ログイン時) */}
          {isLoggedIn ? (
            <div>
              <label className="text-sm flex items-center">ユーザー</label>
              <p className="mt-1 text-base">{profile.nickname ?? "ユーザー"}</p>
            </div>
          ) : (
            <div>
              <label className="text-sm flex items-center">
                お名前 <span className="ml-1 text-[10px] text-[#8b8b8b] border border-[#c4c4c4] rounded px-1 py-px">必須</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                className={inputClass}
                placeholder="お名前"
              />
              {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
            </div>
          )}

          {/* メールアドレス */}
          <div>
            <label className="text-sm flex items-center">
              メールアドレス <span className="ml-1 text-[10px] text-[#8b8b8b] border border-[#c4c4c4] rounded px-1 py-px">必須</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              className={inputClass}
              placeholder="example@email.com"
            />
            {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
            <p className="text-xs text-[#8b8b8b] mt-1">返信先として使用します</p>
          </div>

          {/* カテゴリ */}
          <div>
            <label className="text-sm flex items-center">
              カテゴリ <span className="ml-1 text-[10px] text-[#8b8b8b] border border-[#c4c4c4] rounded px-1 py-px">必須</span>
            </label>
            <select
              value={form.category}
              onChange={(e) => updateField("category", e.target.value)}
              className={inputClass}
            >
              <option value="">選択してください</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            {errors.category && <p className="text-sm text-red-500 mt-1">{errors.category}</p>}
          </div>

          {/* お問い合わせ内容 */}
          <div>
            <label className="text-sm flex items-center">
              お問い合わせ内容 <span className="ml-1 text-[10px] text-[#8b8b8b] border border-[#c4c4c4] rounded px-1 py-px">必須</span>
            </label>
            <textarea
              value={form.message}
              onChange={(e) => updateField("message", e.target.value)}
              className={`${inputClass} min-h-[120px] resize-y`}
              placeholder="お問い合わせ内容をご記入ください"
            />
            {errors.message && <p className="text-sm text-red-500 mt-1">{errors.message}</p>}
          </div>

          {/* Turnstile */}
          <div className="flex justify-center">
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
        <div className="flex flex-col items-center gap-2 px-6 pt-4 pb-2">
          <button
            type="submit"
            disabled={submitting}
            className="w-full max-w-xs rounded-full bg-white py-2.5 text-base font-bold text-[#006728] disabled:opacity-50"
          >
            {submitting ? "送信中..." : "送信する"}
          </button>
        </div>
      </form>
    </div>
  );
}

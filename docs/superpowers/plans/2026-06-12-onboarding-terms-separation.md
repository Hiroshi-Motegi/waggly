# Onboarding/Terms Separation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate onboarding (app intro, 3 slides) from terms agreement (login-only, independent screen) so they are fully independent features

**Architecture:** Extract terms agreement UI from onboarding.tsx into a new TermsAgreement component. Simplify onboarding to 3 slides only. Update app-shell.tsx to check onboarding and terms as two independent gates with separate rendering.

**Tech Stack:** React, TypeScript, Next.js

---

## File Structure

| File | Responsibility |
|---|---|
| Create: `src/components/terms-agreement.tsx` | Standalone terms agreement screen (checkbox + agree button) |
| Modify: `src/components/onboarding.tsx` | Remove slide 4 (terms), remove `isReagreement` mode, 3 slides only |
| Modify: `src/components/app-shell.tsx` | Separate onboarding/terms gates, independent rendering |

---

### Task 1: Create TermsAgreement component

**Files:**
- Create: `src/components/terms-agreement.tsx`

- [ ] **Step 1: Create the component**

Extract the terms UI from onboarding.tsx into a standalone component. It needs two modes: first-time agreement and re-agreement (after terms update). The `termsContent` array is moved here since it belongs to this feature now.

```tsx
// src/components/terms-agreement.tsx
"use client";

import { useState } from "react";

interface TermsAgreementProps {
  onAgree: () => void;
  isReagreement?: boolean;
}

const termsContent = [
  { title: "第1条（サービス内容）", body: "Waggly（以下「本サービス」）は、ゴルフクラブの管理、練習記録、AIによるアドバイス機能を提供するWebアプリケーションです。" },
  { title: "第2条（AI機能について）", body: "本サービスのAIコーチ機能はベータ版として提供しています。AIの回答は一般的な情報に基づくものであり、正確性を保証するものではありません。ゴルフの指導やクラブ選びの最終判断はご自身で行ってください。" },
  { title: "第3条（個人情報の取り扱い）", body: "本サービスでは、LINEアカウント情報（表示名・プロフィール画像）、登録されたクラブ情報、練習記録、AIとの会話履歴を保存します。これらの情報はサービス提供の目的のみに使用し、個人を特定できる形での第三者への提供は行いません。" },
  { title: "第4条（匿名データの活用）", body: "本サービスでは、サービス品質の向上を目的として、ユーザーの登録データ（クラブスペック、練習記録、AI提案への評価等）を匿名化・統計化した上で、AI機能の改善に活用する場合があります。統計データには個人を特定できる情報は含まれません。例：クラブの平均飛距離、練習メニューの傾向分析等。" },
  { title: "第5条（禁止事項）", body: "本サービスへの不正アクセスや過度な負荷をかける行為、AI機能を本来の目的以外で利用する行為、他のユーザーに迷惑をかける行為を禁止します。" },
  { title: "第6条（免責事項）", body: "本サービスは現状有姿で提供され、特定の目的への適合性を保証しません。本サービスの利用により生じた損害について、運営者は一切の責任を負いません。" },
  { title: "第7条（サービスの変更・停止）", body: "運営者は、事前の通知なくサービス内容の変更、または提供の停止を行うことがあります。" },
  { title: "第8条（規約の変更）", body: "本規約は予告なく変更することがあります。変更後の規約は本ページに掲載した時点で効力を生じます。" },
];

export function TermsAgreement({ onAgree, isReagreement }: TermsAgreementProps) {
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  if (showTerms) {
    return (
      <div className="flex flex-col min-h-dvh bg-white">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="text-base font-bold">利用規約</span>
          <button
            onClick={() => setShowTerms(false)}
            className="text-base text-[#006728] font-bold"
          >
            戻る
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-base">
          <p className="text-sm text-[#8b8b8b]">最終更新日: 2026年6月8日</p>
          {termsContent.map((section, i) => (
            <div key={i} className="space-y-1">
              <h3 className="font-bold">{section.title}</h3>
              <p className="text-[#666]">{section.body}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh bg-[#f7fff3]">
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
        {isReagreement ? (
          <>
            <span className="text-6xl mb-6">📋</span>
            <h2 className="text-2xl font-bold mb-3">利用規約が更新されました</h2>
            <p className="text-[#666] text-base leading-relaxed">引き続きご利用いただくには、更新された利用規約への同意が必要です。</p>
          </>
        ) : (
          <>
            <h2 className="text-[32px] font-bold text-[#139847] mb-6">
              さあ、はじめよう！
            </h2>
            <img
              src="/images/onboarding/waggly-ball.svg"
              alt="Waggly"
              width={128}
              height={128}
              className="mt-4 mb-6"
              style={{ animation: "smallBounce 1.2s ease-in-out infinite" }}
            />
            <p className="text-base font-bold text-[#2c2c2c] leading-relaxed">
              ワグリーを利用するためには
              <br />
              利用規約の同意が必要です
            </p>
          </>
        )}
      </div>
      <div className="w-full px-6 pb-6 space-y-4">
        <label className="flex items-center justify-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="h-5 w-5 rounded accent-[#006728]"
          />
          <span className="text-[#666]">
            <button onClick={() => setShowTerms(true)} className="underline text-[#006728]">利用規約</button>
            に同意します
          </span>
        </label>
        <button
          disabled={!agreed}
          onClick={onAgree}
          className="w-full py-3 rounded-full border border-[#006728] text-[#006728] font-bold text-sm disabled:opacity-40"
        >
          はじめる
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/terms-agreement.tsx
git commit -m "feat: create standalone TermsAgreement component"
```

---

### Task 2: Simplify onboarding to 3 slides only

**Files:**
- Modify: `src/components/onboarding.tsx`

- [ ] **Step 1: Remove terms-related code from onboarding**

The changes to `src/components/onboarding.tsx`:

1. Remove `termsContent` array (lines 13-22) — moved to terms-agreement.tsx
2. Remove `Slide4` component (lines 164-201)
3. Change `TOTAL_SLIDES` from `4` to `3`
4. Remove `isReagreement` prop and all reagreement logic
5. Remove `agreed`/`showTerms` state
6. Remove the terms view block (lines 221-243)
7. Remove the reagreement block (lines 247-278)
8. Remove `{currentSlide === 3 && <Slide4 .../>}` from slides view
9. Change last slide button from conditional "はじめる"/"次へ" to always complete on slide 3
10. Remove `handleStart` function — `handleNext` on last slide calls `onComplete`

The simplified component:

```tsx
"use client";

import { useState } from "react";
import Image from "next/image";

interface OnboardingProps {
  onComplete: () => void;
}

const TOTAL_SLIDES = 3;

function Slide1() {
  // ... unchanged (keep exact same code as current lines 24-61)
}

function Slide2() {
  // ... unchanged (keep exact same code as current lines 63-117)
}

function Slide3() {
  // ... unchanged (keep exact same code as current lines 119-161)
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const isLastSlide = currentSlide === TOTAL_SLIDES - 1;

  function handleNext() {
    if (isLastSlide) {
      onComplete();
      return;
    }
    setCurrentSlide(currentSlide + 1);
  }

  return (
    <div className="flex flex-col h-dvh bg-[#f7fff3] overflow-hidden">
      {currentSlide === 0 && <Slide1 />}
      {currentSlide === 1 && <Slide2 />}
      {currentSlide === 2 && <Slide3 />}

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 py-3 flex flex-col items-center gap-3 overflow-hidden">
        <div className="absolute inset-0 bg-[#139847]" />
        <img src="/images/home-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none" />
        <div className="relative flex gap-1.5">
          {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === currentSlide ? "w-5 bg-white" : "w-1.5 bg-white/40"
              }`}
            />
          ))}
        </div>
        <button
          onClick={handleNext}
          className="relative px-8 py-2.5 rounded-full border border-[#006728] bg-white text-[#006728] font-bold text-sm"
        >
          {isLastSlide ? "はじめる" : "次へ"}
        </button>
      </div>
    </div>
  );
}
```

Note: Keep Slide1, Slide2, Slide3 functions exactly as they are — only the Onboarding export function and the top-level constants/interfaces change.

- [ ] **Step 2: Commit**

```bash
git add src/components/onboarding.tsx
git commit -m "refactor: simplify onboarding to 3 slides, remove terms logic"
```

---

### Task 3: Update app-shell.tsx — separate onboarding and terms gates

**Files:**
- Modify: `src/components/app-shell.tsx`

- [ ] **Step 1: Update imports**

```typescript
// Before (line 10):
import { Onboarding } from "@/components/onboarding";

// After:
import { Onboarding } from "@/components/onboarding";
import { TermsAgreement } from "@/components/terms-agreement";
```

- [ ] **Step 2: Replace the combined needsOnboarding logic (lines 97-119)**

Replace this block:
```typescript
  // Show onboarding:
  // - Logged-in (any platform): check agreed_terms_at in DB (cross-device)
  // - Not logged-in (native only): fallback to localStorage flag
  const needsAgreement = user && (
    !user.agreed_terms_at || new Date(user.agreed_terms_at) < new Date(TERMS_UPDATED_AT)
  );
  const needsOnboarding = needsAgreement || (!user && native && !onboardingDone);

  if (needsOnboarding) {
    return (
      <div className={`min-h-dvh border-x border-border shadow-sm bg-background ${native ? "w-full" : "mx-auto max-w-md"}`}>
        <Onboarding
          isReagreement={!!user?.agreed_terms_at}
          onComplete={async () => {
            localStorage.setItem("onboarding_version", String(ONBOARDING_VERSION));
            if (user) {
              await apiFetch("/api/auth/agree", { method: "POST" });
            }
            setOnboardingDone(true);
          }}
        />
      </div>
    );
  }
```

With two independent gates:
```typescript
  // Gate 1: Onboarding (app intro) — localStorage only, login state irrelevant
  if (!onboardingDone) {
    return (
      <div className={`min-h-dvh border-x border-border shadow-sm bg-background ${native ? "w-full" : "mx-auto max-w-md"}`}>
        <Onboarding
          onComplete={() => {
            localStorage.setItem("onboarding_version", String(ONBOARDING_VERSION));
            setOnboardingDone(true);
          }}
        />
      </div>
    );
  }

  // Gate 2: Terms agreement — logged-in users only, DB agreed_terms_at
  // Onboarding and terms are fully independent; children not rendered until both pass
  const needsTermsAgreement = user && (
    !user.agreed_terms_at || new Date(user.agreed_terms_at) < new Date(TERMS_UPDATED_AT)
  );

  if (needsTermsAgreement) {
    return (
      <div className={`min-h-dvh border-x border-border shadow-sm bg-background ${native ? "w-full" : "mx-auto max-w-md"}`}>
        <TermsAgreement
          isReagreement={!!user.agreed_terms_at}
          onAgree={async () => {
            await apiFetch("/api/auth/agree", { method: "POST" });
            // Reload user to update agreed_terms_at in auth context
            window.location.reload();
          }}
        />
      </div>
    );
  }
```

Note: After terms agreement, we `window.location.reload()` so the auth context re-fetches the user with updated `agreed_terms_at`. This is simpler than threading a state update through the auth provider.

- [ ] **Step 3: Build and verify**

Run: `npx next build 2>&1 | tail -5`

Expected: build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/components/app-shell.tsx
git commit -m "refactor: separate onboarding and terms agreement gates

Onboarding = app intro (localStorage, login irrelevant).
Terms = login-only (agreed_terms_at in DB).
Two independent gates, neither renders children until passed."
```

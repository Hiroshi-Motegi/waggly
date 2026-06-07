# 教師データ自動収集パイプライン Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 複数ユーザーの匿名練習データを週次分析し、Claude + Web検索で教師データを自動生成してknowledge_baseにdraft保存する

**Architecture:** Vercel Cronが週1回API Routeを呼び出し、匿名データ集約 → Claude分析 → Tavily検索 → Claude生成 → DB保存のパイプラインを実行。管理画面でdraftをレビュー・承認する。

**Tech Stack:** Next.js 16 API Routes, AI SDK (`ai` + `@ai-sdk/anthropic`), Tavily Search API, Supabase, Vercel Cron

---

## File Structure

| File | Responsibility |
|---|---|
| `supabase/migrations/003_knowledge_auto_collect.sql` | DB: statusカラム追加、is_active移行、auto_runsテーブル作成 |
| `src/lib/knowledge/anonymize.ts` | 練習データの匿名化・集約 |
| `src/lib/knowledge/analyze.ts` | Claude分析（不足トピック特定） |
| `src/lib/knowledge/search.ts` | Tavily API検索ラッパー |
| `src/lib/knowledge/generate.ts` | Claude生成（教師データ作成） |
| `src/lib/knowledge/pipeline.ts` | パイプライン全体のオーケストレーション |
| `src/app/api/admin/knowledge/auto-collect/route.ts` | Cron/手動実行エントリポイント |
| `src/app/api/admin/knowledge/runs/route.ts` | 実行ログAPI |
| `src/app/api/admin/knowledge/route.ts` | 既存: statusフィルタ対応 |
| `src/app/api/admin/knowledge/[id]/route.ts` | 既存: status更新対応 |
| `src/app/api/coach/plan/route.ts` | 既存: is_active → status クエリ変更 |
| `src/app/api/coach/chat/route.ts` | 既存: is_active → status クエリ変更 |
| `src/app/admin/knowledge/page.tsx` | 既存: ステータスフィルタ、実行ログ、承認UI |
| `src/app/admin/knowledge/[id]/page.tsx` | 既存: draft表示（分析理由、参照URL） |
| `vercel.json` | Cron設定 |

---

### Task 1: DBマイグレーション

**Files:**
- Create: `supabase/migrations/003_knowledge_auto_collect.sql`

- [ ] **Step 1: マイグレーションSQLを作成**

```sql
-- 003_knowledge_auto_collect.sql

-- Add status column to knowledge_base
alter table public.knowledge_base
  add column status text not null default 'active'
  check (status in ('draft', 'active', 'inactive', 'rejected'));

-- Migrate is_active data
update public.knowledge_base set status = 'inactive' where is_active = false;

-- Add auto-collection columns
alter table public.knowledge_base
  add column analysis_summary text,
  add column search_sources text[],
  add column generated_at timestamptz;

-- Drop is_active
alter table public.knowledge_base drop column is_active;

-- Update RLS policies (drop old, create new)
drop policy if exists "Authenticated users can read knowledge" on public.knowledge_base;
create policy "Authenticated users can read knowledge" on public.knowledge_base
  for select using (auth.role() = 'authenticated');

-- Auto-run logs table
create table public.knowledge_auto_runs (
  id uuid primary key default gen_random_uuid(),
  ran_at timestamptz not null default now(),
  period_start date not null,
  period_end date not null,
  total_sessions integer not null default 0,
  total_plans integer not null default 0,
  summary text not null,
  topics_generated integer not null default 0,
  status text not null check (status in ('success', 'no_data', 'error')),
  error_message text
);

alter table public.knowledge_auto_runs enable row level security;
create policy "Authenticated users can read runs" on public.knowledge_auto_runs
  for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert runs" on public.knowledge_auto_runs
  for insert with check (auth.role() = 'authenticated');
```

- [ ] **Step 2: Supabase SQL Editorで実行**

Supabaseダッシュボード → SQL Editor → 上記SQLを貼り付けて実行。

- [ ] **Step 3: 既存コードの is_active → status 参照を更新**

`src/app/api/coach/plan/route.ts` 49行目を変更:

```typescript
// Before:
supabase.from("knowledge_base").select("category, title, content").eq("is_active", true),
// After:
supabase.from("knowledge_base").select("category, title, content").eq("status", "active"),
```

`src/app/api/coach/chat/route.ts` 37行目も同様に変更:

```typescript
// Before:
supabase.from("knowledge_base").select("category, title, content").eq("is_active", true),
// After:
supabase.from("knowledge_base").select("category, title, content").eq("status", "active"),
```

- [ ] **Step 4: ビルド確認**

Run: `cd /Users/hiroshi-motegi/Git/Waggly && npx next build 2>&1 | grep -E "(Error|error|admin|coach)"`
Expected: ビルド成功、エラーなし

- [ ] **Step 5: コミット**

```bash
git add supabase/migrations/003_knowledge_auto_collect.sql src/app/api/coach/plan/route.ts src/app/api/coach/chat/route.ts
git commit -m "feat: add knowledge auto-collect migration, update is_active to status"
```

---

### Task 2: Tavily検索ラッパー + npm install

**Files:**
- Create: `src/lib/knowledge/search.ts`

- [ ] **Step 1: Tavilyパッケージをインストール**

Run: `cd /Users/hiroshi-motegi/Git/Waggly && npm install @tavily/core`

- [ ] **Step 2: 検索ラッパーを作成**

```typescript
// src/lib/knowledge/search.ts
import { tavily } from "@tavily/core";

const client = tavily({ apiKey: process.env.TAVILY_API_KEY! });

export interface SearchResult {
  title: string;
  url: string;
  content: string;
}

export async function searchGolfKnowledge(query: string): Promise<{
  results: SearchResult[];
  answer: string | null;
}> {
  const response = await client.search(query, {
    searchDepth: "advanced",
    includeAnswer: true,
    maxResults: 5,
  });

  return {
    results: response.results.map((r) => ({
      title: r.title,
      url: r.url,
      content: r.content,
    })),
    answer: response.answer ?? null,
  };
}
```

- [ ] **Step 3: コミット**

```bash
git add src/lib/knowledge/search.ts package.json package-lock.json
git commit -m "feat: add Tavily search wrapper for knowledge collection"
```

---

### Task 3: 匿名データ集約

**Files:**
- Create: `src/lib/knowledge/anonymize.ts`

- [ ] **Step 1: 匿名化モジュールを作成**

```typescript
// src/lib/knowledge/anonymize.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export interface AnonymousSessionData {
  total_count: number;
  avg_rating: number | null;
  ratings: { rating: number; count: number }[];
  top_clubs: { club_number: string; total_balls: number }[];
  memos: string[];
  low_rated_memos: string[];
}

export interface AnonymousPlanData {
  total_count: number;
  avg_rating: number | null;
  high_rated: { title: string; rating: number }[];
  low_rated: { title: string; rating: number }[];
  comments: string[];
}

export async function getAnonymousSessions(
  supabase: SupabaseClient,
  days: number
): Promise<AnonymousSessionData> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const { data: sessions } = await supabase
    .from("practice_sessions")
    .select("total_balls, memo, rating, practice_clubs(balls, club:clubs(club_number))")
    .gte("practiced_at", since);

  const items = sessions ?? [];

  // Rating distribution
  const ratingCounts = new Map<number, number>();
  let ratingSum = 0;
  let ratingCount = 0;
  for (const s of items) {
    if (s.rating != null) {
      ratingCounts.set(s.rating, (ratingCounts.get(s.rating) ?? 0) + 1);
      ratingSum += s.rating;
      ratingCount++;
    }
  }

  // Top clubs by total balls
  const clubBalls = new Map<string, number>();
  for (const s of items) {
    for (const pc of s.practice_clubs ?? []) {
      const cn = (pc as any).club?.club_number ?? "?";
      clubBalls.set(cn, (clubBalls.get(cn) ?? 0) + pc.balls);
    }
  }
  const topClubs = [...clubBalls.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([club_number, total_balls]) => ({ club_number, total_balls }));

  // Memos (anonymized - strip location-like patterns)
  const allMemos = items
    .filter((s) => s.memo)
    .map((s) => s.memo!.replace(/[\w\u3000-\u9FFF]+練習場/g, "練習場").trim())
    .filter((m) => m.length > 0);

  const lowRatedMemos = items
    .filter((s) => s.rating != null && s.rating <= 2 && s.memo)
    .map((s) => s.memo!.replace(/[\w\u3000-\u9FFF]+練習場/g, "練習場").trim());

  return {
    total_count: items.length,
    avg_rating: ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : null,
    ratings: [...ratingCounts.entries()]
      .map(([rating, count]) => ({ rating, count }))
      .sort((a, b) => a.rating - b.rating),
    top_clubs: topClubs,
    memos: allMemos.slice(0, 20),
    low_rated_memos: lowRatedMemos.slice(0, 10),
  };
}

export async function getAnonymousPlanFeedback(
  supabase: SupabaseClient,
  days: number
): Promise<AnonymousPlanData> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const { data: plans } = await supabase
    .from("practice_plans")
    .select("title, status, rating, memo")
    .gte("created_at", since)
    .not("rating", "is", null);

  const items = plans ?? [];

  let ratingSum = 0;
  for (const p of items) ratingSum += p.rating;

  return {
    total_count: items.length,
    avg_rating: items.length > 0 ? Math.round((ratingSum / items.length) * 10) / 10 : null,
    high_rated: items
      .filter((p) => p.rating >= 4)
      .map((p) => ({ title: p.title, rating: p.rating })),
    low_rated: items
      .filter((p) => p.rating <= 2)
      .map((p) => ({ title: p.title, rating: p.rating })),
    comments: items
      .filter((p) => p.memo)
      .map((p) => p.memo!)
      .slice(0, 15),
  };
}
```

- [ ] **Step 2: コミット**

```bash
git add src/lib/knowledge/anonymize.ts
git commit -m "feat: anonymous practice data aggregation for knowledge pipeline"
```

---

### Task 4: Claude分析（トピック提案）

**Files:**
- Create: `src/lib/knowledge/analyze.ts`

- [ ] **Step 1: 分析モジュールを作成**

```typescript
// src/lib/knowledge/analyze.ts
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import type { AnonymousSessionData, AnonymousPlanData } from "./anonymize";

export interface AnalysisTopic {
  topic: string;
  reason: string;
  category: string;
  search_query: string;
}

export interface AnalysisResult {
  summary: string;
  topics: AnalysisTopic[];
}

export async function analyzeKnowledgeGaps(
  sessions: AnonymousSessionData,
  plans: AnonymousPlanData,
  existingTitles: string[]
): Promise<AnalysisResult> {
  const prompt = `あなたはゴルフ教育の専門家です。
以下の匿名練習データを分析し、AIゴルフコーチの知識ベースに追加すべきトピックを提案してください。

## 今週の練習データ（匿名）
- 練習記録数: ${sessions.total_count}件
- 平均評価: ${sessions.avg_rating ?? "なし"}
- よく練習された番手: ${sessions.top_clubs.map((c) => `${c.club_number}(${c.total_balls}球)`).join(", ") || "なし"}
- 低評価の練習メモ:
${sessions.low_rated_memos.map((m) => `  - ${m}`).join("\n") || "  なし"}
- その他のメモ（抜粋）:
${sessions.memos.slice(0, 10).map((m) => `  - ${m}`).join("\n") || "  なし"}

## プラン評価データ（匿名）
- 評価済みプラン数: ${plans.total_count}件
- 高評価プラン（★4-5）: ${plans.high_rated.map((p) => `${p.title}(★${p.rating})`).join(", ") || "なし"}
- 低評価プラン（★1-2）: ${plans.low_rated.map((p) => `${p.title}(★${p.rating})`).join(", ") || "なし"}
- ユーザーのコメント:
${plans.comments.map((c) => `  - ${c}`).join("\n") || "  なし"}

## 既存の教師データ（タイトル一覧）
${existingTitles.map((t) => `- ${t}`).join("\n") || "なし"}

## 指示
- 既存データと重複しないトピックを最大5件提案してください
- 各トピックについて、なぜ必要かの理由と、Web検索用のクエリを含めてください
- カテゴリは以下から選択: swing_basics, pga_data, drill, equipment, mental, course_strategy, fitness, rules
- データが少ない場合は、一般的なアマチュアゴルファーに役立つ基礎知識を提案してください

JSON形式のみで出力（コードフェンスなし）:
{
  "summary": "今週の傾向を1-2文で",
  "topics": [
    {
      "topic": "トピック名",
      "reason": "なぜこの知識が必要か",
      "category": "カテゴリ",
      "search_query": "ゴルフ ○○ ドリル 練習方法"
    }
  ]
}`;

  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-6"),
    prompt,
    maxOutputTokens: 1500,
  });

  // Extract JSON from response (handle possible code fences)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse analysis response");
  }

  return JSON.parse(jsonMatch[0]) as AnalysisResult;
}
```

- [ ] **Step 2: コミット**

```bash
git add src/lib/knowledge/analyze.ts
git commit -m "feat: Claude analysis for knowledge gap detection"
```

---

### Task 5: Claude生成（教師データ作成）

**Files:**
- Create: `src/lib/knowledge/generate.ts`

- [ ] **Step 1: 生成モジュールを作成**

```typescript
// src/lib/knowledge/generate.ts
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import type { AnalysisTopic } from "./analyze";
import type { SearchResult } from "./search";

export interface GeneratedKnowledge {
  title: string;
  content: string;
  tags: string[];
}

export async function generateKnowledgeItem(
  topic: AnalysisTopic,
  searchResults: SearchResult[],
  searchAnswer: string | null
): Promise<GeneratedKnowledge> {
  const searchContent = searchResults
    .map((r) => `### ${r.title}\nURL: ${r.url}\n${r.content}`)
    .join("\n\n");

  const prompt = `以下のWeb検索結果を元に、ゴルフAIコーチ向けの教師データを作成してください。

## トピック: ${topic.topic}
## 必要な理由: ${topic.reason}
## カテゴリ: ${topic.category}

## Web検索結果
${searchAnswer ? `### AI要約\n${searchAnswer}\n` : ""}
${searchContent}

## 指示
- 正確で実践的な内容にしてください
- アマチュアゴルファーが理解できる言葉で書いてください
- 統計データがあれば出典付きで含めてください
- 適切に改行・段落分けして読みやすくしてください
- 400-800文字程度で

JSON形式のみで出力（コードフェンスなし）:
{
  "title": "タイトル",
  "content": "本文（改行は\\nで表現）",
  "tags": ["タグ1", "タグ2"]
}`;

  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-6"),
    prompt,
    maxOutputTokens: 1500,
  });

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse generation response");
  }

  return JSON.parse(jsonMatch[0]) as GeneratedKnowledge;
}
```

- [ ] **Step 2: コミット**

```bash
git add src/lib/knowledge/generate.ts
git commit -m "feat: Claude knowledge item generation from search results"
```

---

### Task 6: パイプラインオーケストレーション

**Files:**
- Create: `src/lib/knowledge/pipeline.ts`

- [ ] **Step 1: パイプラインモジュールを作成**

```typescript
// src/lib/knowledge/pipeline.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAnonymousSessions, getAnonymousPlanFeedback } from "./anonymize";
import { analyzeKnowledgeGaps } from "./analyze";
import { searchGolfKnowledge } from "./search";
import { generateKnowledgeItem } from "./generate";

export interface PipelineResult {
  status: "success" | "no_data" | "error";
  summary: string;
  topicsGenerated: number;
  errorMessage?: string;
}

export async function runAutoCollectPipeline(
  supabase: SupabaseClient
): Promise<PipelineResult> {
  const periodEnd = new Date();
  const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // 1. Collect anonymous data
  const [sessions, plans] = await Promise.all([
    getAnonymousSessions(supabase, 7),
    getAnonymousPlanFeedback(supabase, 7),
  ]);

  // Skip if no data
  if (sessions.total_count === 0 && plans.total_count === 0) {
    await saveRun(supabase, {
      periodStart,
      periodEnd,
      totalSessions: 0,
      totalPlans: 0,
      summary: "対象データなし",
      topicsGenerated: 0,
      status: "no_data",
    });
    return { status: "no_data", summary: "対象データなし", topicsGenerated: 0 };
  }

  // 2. Get existing knowledge titles
  const { data: existing } = await supabase
    .from("knowledge_base")
    .select("title")
    .eq("status", "active");
  const existingTitles = (existing ?? []).map((k: any) => k.title);

  // 3. Analyze gaps
  const analysis = await analyzeKnowledgeGaps(sessions, plans, existingTitles);

  // 4. For each topic: search + generate + save as draft
  let topicsGenerated = 0;
  for (const topic of analysis.topics) {
    try {
      const { results, answer } = await searchGolfKnowledge(topic.search_query);
      const generated = await generateKnowledgeItem(topic, results, answer);

      await supabase.from("knowledge_base").insert({
        category: topic.category,
        title: generated.title,
        content: generated.content,
        tags: generated.tags,
        source: "auto-collected",
        status: "draft",
        analysis_summary: topic.reason,
        search_sources: results.map((r) => r.url),
        generated_at: new Date().toISOString(),
      });

      topicsGenerated++;
    } catch (err) {
      console.error(`Failed to generate topic "${topic.topic}":`, err);
    }
  }

  // 5. Save run log
  await saveRun(supabase, {
    periodStart,
    periodEnd,
    totalSessions: sessions.total_count,
    totalPlans: plans.total_count,
    summary: analysis.summary,
    topicsGenerated,
    status: "success",
  });

  return {
    status: "success",
    summary: analysis.summary,
    topicsGenerated,
  };
}

async function saveRun(
  supabase: SupabaseClient,
  data: {
    periodStart: Date;
    periodEnd: Date;
    totalSessions: number;
    totalPlans: number;
    summary: string;
    topicsGenerated: number;
    status: "success" | "no_data" | "error";
    errorMessage?: string;
  }
) {
  await supabase.from("knowledge_auto_runs").insert({
    period_start: data.periodStart.toISOString().split("T")[0],
    period_end: data.periodEnd.toISOString().split("T")[0],
    total_sessions: data.totalSessions,
    total_plans: data.totalPlans,
    summary: data.summary,
    topics_generated: data.topicsGenerated,
    status: data.status,
    error_message: data.errorMessage ?? null,
  });
}
```

- [ ] **Step 2: コミット**

```bash
git add src/lib/knowledge/pipeline.ts
git commit -m "feat: knowledge auto-collect pipeline orchestration"
```

---

### Task 7: API Route（Cron/手動エントリポイント）

**Files:**
- Create: `src/app/api/admin/knowledge/auto-collect/route.ts`

- [ ] **Step 1: API Routeを作成**

```typescript
// src/app/api/admin/knowledge/auto-collect/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getApiAuth } from "@/lib/supabase/api";
import { runAutoCollectPipeline } from "@/lib/knowledge/pipeline";

export const maxDuration = 60; // Allow up to 60s for pipeline

export async function POST(request: NextRequest) {
  // Auth: Vercel Cron uses Authorization header, manual uses session
  const authHeader = request.headers.get("authorization");
  let supabase;

  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    // Cron invocation — use service role
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  } else {
    // Manual invocation — use session auth
    const auth = await getApiAuth();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    supabase = auth.supabase;
  }

  try {
    const result = await runAutoCollectPipeline(supabase);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    // Save error run log
    try {
      await supabase.from("knowledge_auto_runs").insert({
        period_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        period_end: new Date().toISOString().split("T")[0],
        total_sessions: 0,
        total_plans: 0,
        summary: "パイプライン実行エラー",
        topics_generated: 0,
        status: "error",
        error_message: message,
      });
    } catch { /* ignore logging error */ }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: コミット**

```bash
git add src/app/api/admin/knowledge/auto-collect/route.ts
git commit -m "feat: auto-collect API route with cron and manual auth"
```

---

### Task 8: 実行ログAPI

**Files:**
- Create: `src/app/api/admin/knowledge/runs/route.ts`

- [ ] **Step 1: 実行ログAPIを作成**

```typescript
// src/app/api/admin/knowledge/runs/route.ts
import { NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";

export async function GET() {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase } = auth;

  const { data, error } = await supabase
    .from("knowledge_auto_runs")
    .select("*")
    .order("ran_at", { ascending: false })
    .limit(10);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
```

- [ ] **Step 2: コミット**

```bash
git add src/app/api/admin/knowledge/runs/route.ts
git commit -m "feat: knowledge auto-run logs API"
```

---

### Task 9: 管理画面 GET API にステータスフィルタ追加

**Files:**
- Modify: `src/app/api/admin/knowledge/route.ts`

- [ ] **Step 1: GETにstatusフィルタを追加**

`src/app/api/admin/knowledge/route.ts` を以下に変更:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";

export async function GET(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase } = auth;

  const category = request.nextUrl.searchParams.get("category");
  const status = request.nextUrl.searchParams.get("status");

  let query = supabase
    .from("knowledge_base")
    .select("*")
    .order("created_at", { ascending: false });

  if (category) query = query.eq("category", category);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase } = auth;

  const body = await request.json();

  const { data, error } = await supabase
    .from("knowledge_base")
    .insert(body)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
```

- [ ] **Step 2: コミット**

```bash
git add src/app/api/admin/knowledge/route.ts
git commit -m "feat: add status filter to knowledge list API"
```

---

### Task 10: 管理画面 一覧ページ更新

**Files:**
- Modify: `src/app/admin/knowledge/page.tsx`

- [ ] **Step 1: ステータスフィルタ、実行ログ、承認UIを追加**

`src/app/admin/knowledge/page.tsx` を以下に全面書き換え:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface KnowledgeItem {
  id: string;
  category: string;
  title: string;
  content: string;
  tags: string[] | null;
  source: string | null;
  status: string;
  analysis_summary: string | null;
  search_sources: string[] | null;
  generated_at: string | null;
  created_at: string;
}

interface AutoRun {
  id: string;
  ran_at: string;
  summary: string;
  topics_generated: number;
  status: string;
  total_sessions: number;
  total_plans: number;
  error_message: string | null;
}

const categories = [
  { value: "swing_basics", label: "スイング基礎" },
  { value: "pga_data", label: "PGAデータ" },
  { value: "drill", label: "ドリル" },
  { value: "equipment", label: "用具知識" },
  { value: "mental", label: "メンタル" },
  { value: "course_strategy", label: "コース戦略" },
  { value: "fitness", label: "フィットネス" },
  { value: "rules", label: "ルール" },
];

const statusFilters = [
  { value: "", label: "すべて" },
  { value: "draft", label: "レビュー待ち" },
  { value: "active", label: "有効" },
  { value: "inactive", label: "無効" },
  { value: "rejected", label: "却下" },
];

function statusBadge(status: string) {
  switch (status) {
    case "draft": return <Badge variant="default">レビュー待ち</Badge>;
    case "active": return <Badge variant="secondary">有効</Badge>;
    case "inactive": return <Badge variant="outline">無効</Badge>;
    case "rejected": return <Badge variant="destructive">却下</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

export default function KnowledgePage() {
  const router = useRouter();
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [latestRun, setLatestRun] = useState<AutoRun | null>(null);
  const [isCollecting, setIsCollecting] = useState(false);

  async function fetchItems() {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (filterCategory) params.set("category", filterCategory);
    if (filterStatus) params.set("status", filterStatus);
    const qs = params.toString();
    const res = await fetch(`/api/admin/knowledge${qs ? `?${qs}` : ""}`);
    if (res.ok) setItems(await res.json());
    setIsLoading(false);
  }

  async function fetchLatestRun() {
    const res = await fetch("/api/admin/knowledge/runs");
    if (res.ok) {
      const runs = await res.json();
      setLatestRun(runs[0] ?? null);
    }
  }

  useEffect(() => { fetchItems(); }, [filterCategory, filterStatus]);
  useEffect(() => { fetchLatestRun(); }, []);

  async function handleStatusChange(id: string, newStatus: string) {
    await fetch(`/api/admin/knowledge/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchItems();
  }

  async function handleDelete(id: string) {
    if (!confirm("削除しますか？")) return;
    await fetch(`/api/admin/knowledge/${id}`, { method: "DELETE" });
    fetchItems();
  }

  async function handleManualCollect() {
    setIsCollecting(true);
    try {
      await fetch("/api/admin/knowledge/auto-collect", { method: "POST" });
      await Promise.all([fetchItems(), fetchLatestRun()]);
    } finally {
      setIsCollecting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-bold">教師データ管理</h1>

      {/* Latest run summary */}
      {latestRun && (
        <Card>
          <CardContent className="p-3 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">最新の自動収集</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(latestRun.ran_at).toLocaleDateString("ja-JP")} —
                  {latestRun.status === "success"
                    ? ` ${latestRun.topics_generated}件生成（${latestRun.total_sessions}練習, ${latestRun.total_plans}プラン分析）`
                    : latestRun.status === "no_data"
                      ? " 対象データなし"
                      : ` エラー: ${latestRun.error_message}`}
                </p>
                {latestRun.status === "success" && (
                  <p className="text-xs mt-1">{latestRun.summary}</p>
                )}
              </div>
              <Button size="sm" variant="outline" onClick={handleManualCollect} disabled={isCollecting}>
                {isCollecting ? "実行中..." : "今すぐ実行"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {!latestRun && (
        <Button size="sm" variant="outline" onClick={handleManualCollect} disabled={isCollecting}>
          {isCollecting ? "実行中..." : "自動収集を実行"}
        </Button>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-11 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {statusFilters.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="h-11 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">すべてのカテゴリ</option>
          {categories.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <Button onClick={() => router.push("/admin/knowledge/new")}>＋ 追加</Button>
      </div>

      <p className="text-sm text-muted-foreground">{items.length}件</p>

      {isLoading ? (
        <p className="text-center text-muted-foreground">読み込み中...</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Card key={item.id} className={item.status === "inactive" || item.status === "rejected" ? "opacity-50" : ""}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">
                    {categories.find((c) => c.value === item.category)?.label ?? item.category}
                  </Badge>
                  <span className="text-sm font-medium">{item.title}</span>
                  {statusBadge(item.status)}
                  {item.source === "auto-collected" && (
                    <Badge variant="outline" className="text-xs">自動生成</Badge>
                  )}
                </div>

                {/* Analysis summary for drafts */}
                {item.status === "draft" && item.analysis_summary && (
                  <p className="text-xs text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400 rounded p-2">
                    分析理由: {item.analysis_summary}
                  </p>
                )}

                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{item.content}</p>

                {item.tags && item.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {item.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                )}

                {/* Search sources for auto-generated */}
                {item.search_sources && item.search_sources.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    参照: {item.search_sources.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline mr-2">
                        [{i + 1}]
                      </a>
                    ))}
                  </div>
                )}

                {item.source && item.source !== "auto-collected" && (
                  <p className="text-xs text-muted-foreground">出典: {item.source}</p>
                )}

                <Separator />
                <div className="flex gap-2 text-xs flex-wrap">
                  <button onClick={() => router.push(`/admin/knowledge/${item.id}`)} className="text-primary hover:underline">
                    編集
                  </button>
                  {item.status === "draft" && (
                    <>
                      <button onClick={() => handleStatusChange(item.id, "active")} className="text-green-600 hover:underline">
                        承認
                      </button>
                      <button onClick={() => handleStatusChange(item.id, "rejected")} className="text-orange-600 hover:underline">
                        却下
                      </button>
                    </>
                  )}
                  {item.status === "active" && (
                    <button onClick={() => handleStatusChange(item.id, "inactive")} className="text-muted-foreground hover:underline">
                      無効化
                    </button>
                  )}
                  {item.status === "inactive" && (
                    <button onClick={() => handleStatusChange(item.id, "active")} className="text-muted-foreground hover:underline">
                      有効化
                    </button>
                  )}
                  <button onClick={() => handleDelete(item.id)} className="text-destructive hover:underline">
                    削除
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: ビルド確認**

Run: `cd /Users/hiroshi-motegi/Git/Waggly && npx next build 2>&1 | grep -E "(Error|error|admin)"`
Expected: ビルド成功

- [ ] **Step 3: コミット**

```bash
git add src/app/admin/knowledge/page.tsx
git commit -m "feat: knowledge admin with status filters, run log, approve/reject UI"
```

---

### Task 11: 編集ページにdraft情報表示

**Files:**
- Modify: `src/app/admin/knowledge/[id]/page.tsx`

- [ ] **Step 1: 編集ページにstatus・分析理由・参照URLの表示を追加**

`src/app/admin/knowledge/[id]/page.tsx` を以下に全面書き換え:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const categories = [
  { value: "swing_basics", label: "スイング基礎" },
  { value: "pga_data", label: "PGAデータ" },
  { value: "drill", label: "ドリル" },
  { value: "equipment", label: "用具知識" },
  { value: "mental", label: "メンタル" },
  { value: "course_strategy", label: "コース戦略" },
  { value: "fitness", label: "フィットネス" },
  { value: "rules", label: "ルール" },
];

export default function KnowledgeEditPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";

  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [meta, setMeta] = useState<{
    status: string;
    analysis_summary: string | null;
    search_sources: string[] | null;
    generated_at: string | null;
  } | null>(null);
  const [form, setForm] = useState({
    category: "swing_basics",
    title: "",
    content: "",
    tags: "",
    source: "",
  });

  useEffect(() => {
    if (isNew) return;
    fetch(`/api/admin/knowledge/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setForm({
          category: data.category,
          title: data.title,
          content: data.content,
          tags: data.tags?.join(", ") ?? "",
          source: data.source ?? "",
        });
        setMeta({
          status: data.status,
          analysis_summary: data.analysis_summary,
          search_sources: data.search_sources,
          generated_at: data.generated_at,
        });
      })
      .finally(() => setIsLoading(false));
  }, [id, isNew]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);

    const body = {
      category: form.category,
      title: form.title,
      content: form.content,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      source: form.source || null,
    };

    if (isNew) {
      await fetch("/api/admin/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, status: "active" }),
      });
    } else {
      await fetch(`/api/admin/knowledge/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    router.push("/admin/knowledge");
  }

  async function handleApprove() {
    await fetch(`/api/admin/knowledge/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "active" }),
    });
    router.push("/admin/knowledge");
  }

  async function handleReject() {
    await fetch(`/api/admin/knowledge/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected" }),
    });
    router.push("/admin/knowledge");
  }

  if (isLoading) {
    return <p className="text-center text-muted-foreground p-8">読み込み中...</p>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/knowledge")}>
          ← 戻る
        </Button>
        <h1 className="text-xl font-bold">{isNew ? "教師データ追加" : "教師データ編集"}</h1>
      </div>

      {/* Auto-generated metadata */}
      {meta?.status === "draft" && (
        <Card className="border-blue-200 dark:border-blue-800">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="default">レビュー待ち</Badge>
              {meta.generated_at && (
                <span className="text-xs text-muted-foreground">
                  {new Date(meta.generated_at).toLocaleDateString("ja-JP")} 自動生成
                </span>
              )}
            </div>
            {meta.analysis_summary && (
              <p className="text-sm"><span className="font-medium">分析理由:</span> {meta.analysis_summary}</p>
            )}
            {meta.search_sources && meta.search_sources.length > 0 && (
              <div className="text-sm">
                <span className="font-medium">参照URL:</span>
                <ul className="list-disc list-inside mt-1">
                  {meta.search_sources.map((url, i) => (
                    <li key={i}>
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs break-all">
                        {url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleApprove}>承認して有効化</Button>
              <Button size="sm" variant="outline" onClick={handleReject}>却下</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>カテゴリ</Label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label>タイトル</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="例: 正しい軸回転の基本"
                required
              />
            </div>

            <div className="space-y-1">
              <Label>コンテンツ</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="教師データの内容...&#10;&#10;改行で段落を分けて書けます"
                rows={12}
                className="h-auto"
                required
              />
            </div>

            <div className="space-y-1">
              <Label>タグ（カンマ区切り）</Label>
              <Input
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="例: スイング, 軸, 回転"
              />
            </div>

            <div className="space-y-1">
              <Label>出典</Label>
              <Input
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                placeholder="例: PGA Teaching Manual"
              />
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => router.push("/admin/knowledge")}>
                キャンセル
              </Button>
              <Button type="submit" className="flex-1" disabled={isSaving}>
                {isSaving ? "保存中..." : isNew ? "追加" : "更新"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: コミット**

```bash
git add src/app/admin/knowledge/\[id\]/page.tsx
git commit -m "feat: show draft metadata, approve/reject in knowledge edit page"
```

---

### Task 12: Vercel Cron設定 + 環境変数

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: vercel.jsonを作成**

```json
{
  "crons": [
    {
      "path": "/api/admin/knowledge/auto-collect",
      "schedule": "0 21 * * 0"
    }
  ]
}
```

- [ ] **Step 2: 環境変数の確認事項をメモ**

Vercelダッシュボードで以下の環境変数を設定:
- `TAVILY_API_KEY` — https://tavily.com でAPIキーを取得
- `CRON_SECRET` — Vercelが自動生成（Settings → Environment Variables で確認）

- [ ] **Step 3: ビルド確認**

Run: `cd /Users/hiroshi-motegi/Git/Waggly && npx next build 2>&1 | tail -30`
Expected: 全ルートが表示されビルド成功

- [ ] **Step 4: コミット**

```bash
git add vercel.json
git commit -m "feat: add Vercel cron for weekly knowledge auto-collection"
```

---

### Task 13: 最終確認 + push

- [ ] **Step 1: 全体ビルド確認**

Run: `cd /Users/hiroshi-motegi/Git/Waggly && npx next build 2>&1 | grep -E "(Error|error|✓|○|ƒ)" | head -30`
Expected: 全ルートが正常にビルドされる

- [ ] **Step 2: git status で未コミットファイルがないか確認**

Run: `git status`
Expected: clean working tree

- [ ] **Step 3: push**

```bash
git push origin main
```

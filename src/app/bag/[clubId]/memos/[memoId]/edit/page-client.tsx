"use client";

import { Loading } from "@/components/loading";
import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useClub } from "@/hooks/use-clubs";
import { apiFetch } from "@/lib/api-client";
import { PageHeader } from "@/components/layout/page-header";
import type { ClubMemo, MemoCondition } from "@/types/database";
import { SYMPTOM_TAGS, FEELING_TAGS, GEAR_TAGS, GOOD_TAGS, getTagsByCondition } from "@/lib/memo-tags";
import { conditionOptions } from "@/components/club/inline-club-memo";
import { nativeHref } from "@/lib/native-routes";

export default function MemoEditPage({ params }: { params: Promise<{ clubId: string; memoId: string }> }) {
  const { clubId, memoId } = use(params);
  const { club } = useClub(clubId);
  const router = useRouter();
  const [condition, setCondition] = useState<MemoCondition | null>(null);
  const [symptomTags, setSymptomTags] = useState<string[]>([]);
  const [feelingTags, setFeelingTags] = useState<string[]>([]);
  const [gearTags, setGearTags] = useState<string[]>([]);
  const [distance, setDistance] = useState("");
  const [memo, setMemo] = useState("");
  const [isFetching, setIsFetching] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch(`/api/clubs/${clubId}/memos/${memoId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ClubMemo | null) => {
        if (data) {
          setCondition(data.condition ?? null);
          setSymptomTags(data.symptom_tags ?? []);
          setFeelingTags(data.feeling_tags ?? []);
          setGearTags(data.gear_tags ?? []);
          setDistance(data.distance?.toString() ?? "");
          setMemo(data.memo ?? "");
        }
      })
      .catch(() => {})
      .finally(() => setIsFetching(false));
  }, [clubId, memoId]);

  function toggleTag(tag: string, current: string[], setter: (v: string[]) => void) {
    setter(current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/clubs/${clubId}/memos/${memoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          distance: distance ? Number(distance) : null,
          memo: memo || null,
          condition,
          symptom_tags: symptomTags,
          feeling_tags: condition === "good" ? [] : feelingTags,
          gear_tags: condition === "good" ? [] : gearTags,
        }),
      });
      if (res.ok) router.push(nativeHref(`/bag/${clubId}/memos/${memoId}`));
    } catch (error) {
      console.error("Failed to update memo:", error);
    } finally {
      setSubmitting(false);
    }
  }

  if (isFetching) return <Loading variant="light" />;

  const tagSet = condition ? getTagsByCondition(condition) : null;

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2 bg-[#139847]" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      <img src="/images/home-bg.jpg" alt="" className="fixed inset-0 w-full h-full object-cover opacity-40 pointer-events-none" />
      <div className="relative z-10 flex flex-col space-y-2">
        <PageHeader title="メモを編集" variant="dark" />

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg bg-white p-4">
          {/* Club info */}
          <div className="flex items-center gap-2">
            <span className="bg-[#006728] text-white text-xs font-bold rounded-md px-2 py-0.5 min-w-[32px] text-center">{club?.club_number}</span>
            {club?.model && <span className="text-base text-[#6c6c6c]">{club.model}</span>}
          </div>

          {/* Condition */}
          <div className="flex gap-2 py-1.5">
            {conditionOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setCondition(opt.value);
                  setSymptomTags([]);
                  setFeelingTags([]);
                  setGearTags([]);
                }}
                className={`flex-1 flex flex-col gap-[7px] items-center rounded p-2 border ${
                  condition === opt.value
                    ? opt.value === "good" ? "border-[#ffc107] bg-[#fff4d2]"
                      : opt.value === "bad" ? "border-[#e74c3c] bg-[#ffeaea]"
                      : "border-[#f39c12] bg-[#fff8e1]"
                    : "border-[#bebebe] bg-white"
                }`}
              >
                <img src={opt.image} alt={opt.label} className="w-8 h-8" />
                <span className="text-base font-bold">{opt.label}</span>
              </button>
            ))}
          </div>

          {/* Tags */}
          {condition && tagSet && (
            <>
              {tagSet.goodTags && condition === "good" && (
                <div className="flex flex-col gap-1 py-0.5">
                  <p className="text-sm">球筋</p>
                  <div className="flex flex-wrap gap-1">
                    {tagSet.goodTags.map((tag) => (
                      <button key={tag} type="button" onClick={() => toggleTag(tag, symptomTags, setSymptomTags)}
                        className={`rounded-full px-[13px] py-1 text-sm font-bold ${symptomTags.includes(tag) ? "bg-[#006728] text-white border border-[#006728]" : "border border-[#999] text-[#414141]"}`}>
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {tagSet.symptomTags && condition !== "good" && (
                <>
                  {tagSet.symptomTags.map((cat) => (
                    <div key={cat.label} className="flex flex-col gap-1 py-0.5">
                      <p className="text-sm">{cat.label}</p>
                      <div className="flex flex-wrap gap-1">
                        {cat.tags.map((tag) => (
                          <button key={tag} type="button" onClick={() => toggleTag(tag, symptomTags, setSymptomTags)}
                            className={`rounded-full px-[13px] py-1 text-sm font-bold ${symptomTags.includes(tag) ? "bg-[#006728] text-white border border-[#006728]" : "border border-[#999] text-[#414141]"}`}>
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {tagSet.feelingTags && condition !== "good" && (
                <div className="flex flex-col gap-1 py-0.5">
                  <p className="text-sm">体の感覚</p>
                  <div className="flex flex-wrap gap-1">
                    {tagSet.feelingTags.map((tag) => (
                      <button key={tag} type="button" onClick={() => toggleTag(tag, feelingTags, setFeelingTags)}
                        className={`rounded-full px-[13px] py-1 text-sm font-bold ${feelingTags.includes(tag) ? "bg-[#006728] text-white border border-[#006728]" : "border border-[#999] text-[#414141]"}`}>
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {tagSet.gearTags && condition !== "good" && (
                <div className="flex flex-col gap-1 py-0.5">
                  <p className="text-sm">ギアの気づき</p>
                  <div className="flex flex-wrap gap-1">
                    {tagSet.gearTags.map((tag) => (
                      <button key={tag} type="button" onClick={() => toggleTag(tag, gearTags, setGearTags)}
                        className={`rounded-full px-[13px] py-1 text-sm font-bold ${gearTags.includes(tag) ? "bg-[#006728] text-white border border-[#006728]" : "border border-[#999] text-[#414141]"}`}>
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Distance */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <input
                type="range"
                min={0}
                max={300}
                step={5}
                value={distance ? Number(distance) : 0}
                onChange={(e) => setDistance(e.target.value === "0" ? "" : e.target.value)}
                className="club-balls-slider w-full"
              />
            </div>
            <div className="flex items-center gap-1 w-[72px] shrink-0">
              <input
                type="number"
                inputMode="decimal"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                placeholder="—"
                className="w-[52px] rounded-md border border-[#c4c4c4] bg-white px-1 py-1.5 text-sm text-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]"
              />
              <span className="text-sm">yd</span>
            </div>
          </div>

          {/* Memo */}
          <div className="flex flex-col gap-0.5 py-1">
            <p className="text-sm">所感・メモ</p>
            <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={3}
              className="w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]" />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button type="button" onClick={() => router.back()}
              className="flex-1 rounded-full border border-[#c4c4c4] py-2 text-base font-bold text-[#666]">
              キャンセル
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 rounded-full bg-[#006728] py-2 text-base font-bold text-white disabled:opacity-50">
              {submitting ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

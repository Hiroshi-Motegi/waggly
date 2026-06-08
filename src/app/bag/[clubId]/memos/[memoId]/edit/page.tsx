"use client";

import { Loading } from "@/components/loading";
import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useClub } from "@/hooks/use-clubs";
import { PageHeader } from "@/components/layout/page-header";
import type { ClubMemo, MemoCondition } from "@/types/database";
import { SYMPTOM_TAGS, FEELING_TAGS, GEAR_TAGS, GOOD_TAGS, getTagsByCondition } from "@/lib/memo-tags";

const conditionOptions: { value: MemoCondition; emoji: string; label: string }[] = [
  { value: "bad", emoji: "😣", label: "悩み" },
  { value: "normal", emoji: "😐", label: "普通" },
  { value: "good", emoji: "😊", label: "好調" },
];

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
    fetch(`/api/clubs/${clubId}/memos/${memoId}`)
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
      const res = await fetch(`/api/clubs/${clubId}/memos/${memoId}`, {
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
      if (res.ok) router.push(`/bag/${clubId}/memos/${memoId}`);
    } catch (error) {
      console.error("Failed to update memo:", error);
    } finally {
      setSubmitting(false);
    }
  }

  if (isFetching) return <Loading />;

  const tagSet = condition ? getTagsByCondition(condition) : null;

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2 bg-[#139847]" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      <img src="/images/home-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none" />
      <div className="relative z-10 flex flex-col space-y-2">
        <PageHeader title="メモを編集" variant="dark" />

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg bg-white p-4">
          {/* Club info */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">{club?.club_number}</span>
            {club?.model && <span className="text-xs text-[#8b8b8b]">{club.model}</span>}
          </div>

          {/* Condition */}
          <div>
            <p className="text-xs font-bold mb-2">調子は？</p>
            <div className="flex gap-2">
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
                  className={`flex-1 rounded-lg border-2 py-2 text-center ${
                    condition === opt.value
                      ? opt.value === "bad" ? "border-[#e74c3c] bg-[#ffeaea]"
                        : opt.value === "good" ? "border-[#27ae60] bg-[#eafbea]"
                        : "border-[#f39c12] bg-[#fff8e1]"
                      : "border-[#ddd] bg-white"
                  }`}
                >
                  <div className="text-xl">{opt.emoji}</div>
                  <div className="text-xs mt-0.5">{opt.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          {condition && tagSet && (
            <>
              {tagSet.goodTags && condition === "good" && (
                <div>
                  <p className="text-xs font-bold mb-2">何が良かった？</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tagSet.goodTags.map((tag) => (
                      <button key={tag} type="button" onClick={() => toggleTag(tag, symptomTags, setSymptomTags)}
                        className={`rounded-full px-3 py-1 text-xs ${symptomTags.includes(tag) ? "bg-[#27ae60] text-white" : "border border-[#ddd] bg-white text-[#333]"}`}>
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {tagSet.symptomTags && condition !== "good" && (
                <div>
                  <p className="text-xs font-bold mb-2">何が起きた？</p>
                  {tagSet.symptomTags.map((cat) => (
                    <div key={cat.label} className="mb-2">
                      <p className="text-[11px] text-[#8b8b8b] mb-1">{cat.label}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {cat.tags.map((tag) => (
                          <button key={tag} type="button" onClick={() => toggleTag(tag, symptomTags, setSymptomTags)}
                            className={`rounded-full px-3 py-1 text-xs ${symptomTags.includes(tag) ? "bg-[#006728] text-white" : "border border-[#ddd] bg-white text-[#333]"}`}>
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tagSet.feelingTags && condition !== "good" && (
                <div>
                  <p className="text-xs font-bold mb-2">体の感覚</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tagSet.feelingTags.map((tag) => (
                      <button key={tag} type="button" onClick={() => toggleTag(tag, feelingTags, setFeelingTags)}
                        className={`rounded-full px-3 py-1 text-xs ${feelingTags.includes(tag) ? "bg-[#006728] text-white" : "border border-[#ddd] bg-white text-[#333]"}`}>
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {tagSet.gearTags && condition !== "good" && (
                <div>
                  <p className="text-xs font-bold mb-2">ギアの気づき</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tagSet.gearTags.map((tag) => (
                      <button key={tag} type="button" onClick={() => toggleTag(tag, gearTags, setGearTags)}
                        className={`rounded-full px-3 py-1 text-xs ${gearTags.includes(tag) ? "bg-[#006728] text-white" : "border border-[#ddd] bg-white text-[#333]"}`}>
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
            <span className="text-xs">飛距離</span>
            <input type="number" value={distance} onChange={(e) => setDistance(e.target.value)}
              className="w-[77px] border-b border-[#c4c4c4] bg-white px-3 py-1 text-center text-sm focus-visible:outline-none" />
            <span className="text-xs">yd</span>
          </div>

          {/* Memo */}
          <div>
            <p className="text-xs font-bold mb-1">メモ（任意）</p>
            <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={2}
              className="w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]" />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button type="button" onClick={() => router.back()}
              className="flex-1 rounded-full border border-[#c4c4c4] py-2 text-sm font-bold text-[#666]">
              キャンセル
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 rounded-full bg-[#006728] py-2 text-sm font-bold text-white disabled:opacity-50">
              {submitting ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

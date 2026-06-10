"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api-client";
import type { MemoCondition } from "@/types/database";
import { getTagsByCondition } from "@/lib/memo-tags";
import { conditionOptions } from "@/components/club/inline-club-memo";

interface Props {
  clubId: string;
  clubNumber: string;
  clubModel?: string | null;
  defaultDistance?: number | null;
  onSaved: () => void;
  onCancel: () => void;
}

export function StructuredMemoForm({ clubId, clubNumber, clubModel, defaultDistance, onSaved, onCancel }: Props) {
  const [condition, setCondition] = useState<MemoCondition | null>(null);
  const [symptomTags, setSymptomTags] = useState<string[]>([]);
  const [feelingTags, setFeelingTags] = useState<string[]>([]);
  const [gearTags, setGearTags] = useState<string[]>([]);
  const [distance, setDistance] = useState<string>(defaultDistance ? String(defaultDistance) : "");
  const [balls, setBalls] = useState<string>("");
  const [memo, setMemo] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function toggleTag(tag: string, current: string[], setter: (v: string[]) => void) {
    setter(current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]);
  }

  const hasContent = condition || distance || memo;

  async function handleSubmit() {
    if (!hasContent) return;
    setIsSaving(true);
    try {
      await apiFetch(`/api/clubs/${clubId}/memos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          distance: distance ? Number(distance) : null,
          balls: balls ? Number(balls) : null,
          memo: memo || null,
          condition,
          symptom_tags: symptomTags,
          feeling_tags: condition === "good" ? [] : feelingTags,
          gear_tags: condition === "good" ? [] : gearTags,
        }),
      });
      onSaved();
    } finally {
      setIsSaving(false);
    }
  }

  const tagSet = condition ? getTagsByCondition(condition) : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="bg-[#006728] text-white text-xs font-bold rounded-md px-2 py-0.5 min-w-[32px] text-center">{clubNumber}</span>
        {clubModel && <span className="text-base text-[#6c6c6c]">{clubModel}</span>}
      </div>

      {/* Condition selector */}
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
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag, symptomTags, setSymptomTags)}
                    className={`rounded-full px-[13px] py-1 text-sm font-bold ${
                      symptomTags.includes(tag)
                        ? "bg-[#006728] text-white border border-[#006728]"
                        : "border border-[#999] text-[#414141]"
                    }`}
                  >
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
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag, symptomTags, setSymptomTags)}
                        className={`rounded-full px-[13px] py-1 text-sm font-bold ${
                          symptomTags.includes(tag)
                            ? "bg-[#006728] text-white border border-[#006728]"
                            : "border border-[#999] text-[#414141]"
                        }`}
                      >
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
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag, feelingTags, setFeelingTags)}
                    className={`rounded-full px-[13px] py-1 text-sm font-bold ${
                      feelingTags.includes(tag)
                        ? "bg-[#006728] text-white border border-[#006728]"
                        : "border border-[#999] text-[#414141]"
                    }`}
                  >
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
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag, gearTags, setGearTags)}
                    className={`rounded-full px-[13px] py-1 text-sm font-bold ${
                      gearTags.includes(tag)
                        ? "bg-[#006728] text-white border border-[#006728]"
                        : "border border-[#999] text-[#414141]"
                    }`}
                  >
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

      {/* Balls */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <input
            type="range"
            min={0}
            max={200}
            step={5}
            value={balls ? Number(balls) : 0}
            onChange={(e) => setBalls(e.target.value === "0" ? "" : e.target.value)}
            className="club-balls-slider w-full"
          />
        </div>
        <div className="flex items-center gap-1 w-[72px] shrink-0">
          <input
            type="number"
            inputMode="numeric"
            value={balls}
            onChange={(e) => setBalls(e.target.value)}
            placeholder="—"
            className="w-[52px] rounded-md border border-[#c4c4c4] bg-white px-1 py-1.5 text-sm text-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]"
          />
          <span className="text-sm">球</span>
        </div>
      </div>

      {/* Memo text */}
      <div className="flex flex-col gap-0.5 py-1">
        <p className="text-sm">所感・メモ</p>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]"
        />
      </div>

      {/* Buttons — rendered outside white card visually via negative margin */}
      <div className="flex flex-col items-center gap-2 -mx-3 -mb-3 pt-4 pb-2 px-3">
        <button
          onClick={handleSubmit}
          disabled={!hasContent || isSaving}
          className="w-full max-w-xs rounded-full bg-white py-2.5 text-base font-bold text-[#006728] disabled:opacity-50"
        >
          {isSaving ? "保存中..." : "保存する"}
        </button>
        <button onClick={onCancel} className="text-base font-bold text-white">
          キャンセル
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import type { MemoCondition } from "@/types/database";
import { getTagsByCondition } from "@/lib/memo-tags";
import { conditionOptions } from "@/components/club/inline-club-memo";

interface Props {
  clubId: string;
  clubNumber: string;
  clubModel?: string | null;
  onSaved: () => void;
  onCancel: () => void;
}

export function StructuredMemoForm({ clubId, clubNumber, clubModel, onSaved, onCancel }: Props) {
  const [condition, setCondition] = useState<MemoCondition | null>(null);
  const [symptomTags, setSymptomTags] = useState<string[]>([]);
  const [feelingTags, setFeelingTags] = useState<string[]>([]);
  const [gearTags, setGearTags] = useState<string[]>([]);
  const [distance, setDistance] = useState<string>("");
  const [memo, setMemo] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function toggleTag(tag: string, current: string[], setter: (v: string[]) => void) {
    setter(current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]);
  }

  async function handleSubmit() {
    if (!condition) return;
    setIsSaving(true);
    try {
      await fetch(`/api/clubs/${clubId}/memos`, {
        method: "POST",
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
      onSaved();
    } finally {
      setIsSaving(false);
    }
  }

  const tagSet = condition ? getTagsByCondition(condition) : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="bg-[#006728] text-white text-sm rounded-full px-2.5">{clubNumber}</span>
        {clubModel && <span className="text-sm text-[#6c6c6c]">{clubModel}</span>}
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
            <span className="text-sm font-bold">{opt.label}</span>
          </button>
        ))}
      </div>

      {/* Tags */}
      {condition && tagSet && (
        <>
          {tagSet.goodTags && condition === "good" && (
            <div className="flex flex-col gap-1 py-0.5">
              <p className="text-xs">球筋</p>
              <div className="flex flex-wrap gap-1">
                {tagSet.goodTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag, symptomTags, setSymptomTags)}
                    className={`rounded-full px-[13px] py-1 text-xs font-bold ${
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
                  <p className="text-xs">{cat.label}</p>
                  <div className="flex flex-wrap gap-1">
                    {cat.tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag, symptomTags, setSymptomTags)}
                        className={`rounded-full px-[13px] py-1 text-xs font-bold ${
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
              <p className="text-xs">体の感覚</p>
              <div className="flex flex-wrap gap-1">
                {tagSet.feelingTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag, feelingTags, setFeelingTags)}
                    className={`rounded-full px-[13px] py-1 text-xs font-bold ${
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
              <p className="text-xs">ギアの気づき</p>
              <div className="flex flex-wrap gap-1">
                {tagSet.gearTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag, gearTags, setGearTags)}
                    className={`rounded-full px-[13px] py-1 text-xs font-bold ${
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
        <span className="text-xs">飛距離</span>
        <input
          type="number"
          value={distance}
          onChange={(e) => setDistance(e.target.value)}
          placeholder=""
          className="w-[77px] border-b border-[#c4c4c4] bg-white px-3 py-1 text-center text-sm focus-visible:outline-none"
        />
        <span className="text-xs">yd</span>
      </div>

      {/* Memo text */}
      <div className="flex flex-col gap-0.5 py-1">
        <p className="text-xs">所感・メモ</p>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]"
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 rounded-full border border-[#c4c4c4] py-2 text-sm font-bold text-[#666]">
          キャンセル
        </button>
        <button
          onClick={handleSubmit}
          disabled={!condition || isSaving}
          className="flex-1 rounded-full bg-[#006728] py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {isSaving ? "保存中..." : "保存"}
        </button>
      </div>
    </div>
  );
}

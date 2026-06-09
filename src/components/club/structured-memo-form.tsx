"use client";

import { useState } from "react";
import type { MemoCondition } from "@/types/database";
import { getTagsByCondition } from "@/lib/memo-tags";

interface Props {
  clubId: string;
  clubNumber: string;
  clubModel?: string | null;
  onSaved: () => void;
  onCancel: () => void;
}

const conditionOptions: { value: MemoCondition; image: string; label: string }[] = [
  { value: "bad", image: "/images/face-bad.png", label: "Bad..." },
  { value: "normal", image: "/images/face-ok.png", label: "OK" },
  { value: "good", image: "/images/face-good.png", label: "Good!" },
];

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
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="font-bold text-sm">{clubNumber}</span>
        {clubModel && <span className="text-xs text-[#8b8b8b]">{clubModel}</span>}
      </div>

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
              <img src={opt.image} alt={opt.label} className="w-8 h-8" />
              <div className="text-xs mt-0.5">{opt.label}</div>
            </button>
          ))}
        </div>
      </div>

      {condition && tagSet && (
        <>
          {tagSet.goodTags && condition === "good" && (
            <div>
              <p className="text-xs font-bold mb-2">何が良かった？</p>
              <div className="flex flex-wrap gap-1.5">
                {tagSet.goodTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag, symptomTags, setSymptomTags)}
                    className={`rounded-full px-3 py-1 text-xs ${
                      symptomTags.includes(tag)
                        ? "bg-[#27ae60] text-white"
                        : "border border-[#ddd] bg-white text-[#333]"
                    }`}
                  >
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
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag, symptomTags, setSymptomTags)}
                        className={`rounded-full px-3 py-1 text-xs ${
                          symptomTags.includes(tag)
                            ? "bg-[#006728] text-white"
                            : "border border-[#ddd] bg-white text-[#333]"
                        }`}
                      >
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
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag, feelingTags, setFeelingTags)}
                    className={`rounded-full px-3 py-1 text-xs ${
                      feelingTags.includes(tag)
                        ? "bg-[#006728] text-white"
                        : "border border-[#ddd] bg-white text-[#333]"
                    }`}
                  >
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
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag, gearTags, setGearTags)}
                    className={`rounded-full px-3 py-1 text-xs ${
                      gearTags.includes(tag)
                        ? "bg-[#006728] text-white"
                        : "border border-[#ddd] bg-white text-[#333]"
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

      <div>
        <p className="text-xs font-bold mb-1">メモ（任意）</p>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]"
        />
      </div>

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

"use client";

import type { MemoCondition } from "@/types/database";
import { getTagsByCondition } from "@/lib/memo-tags";

export interface InlineClubMemoValue {
  condition: MemoCondition;
  symptom_tags: string[];
  feeling_tags: string[];
  gear_tags: string[];
  memo: string | null;
}

interface Props {
  value: InlineClubMemoValue | null;
  onChange: (value: InlineClubMemoValue | null) => void;
}

const conditionOptions: { value: MemoCondition; emoji: string; label: string }[] = [
  { value: "bad", emoji: "😣", label: "悩み" },
  { value: "normal", emoji: "😐", label: "普通" },
  { value: "good", emoji: "😊", label: "好調" },
];

export function InlineClubMemo({ value, onChange }: Props) {
  function setCondition(condition: MemoCondition) {
    onChange({
      condition,
      symptom_tags: [],
      feeling_tags: [],
      gear_tags: [],
      memo: value?.memo ?? null,
    });
  }

  function toggleTag(tag: string, current: string[], field: "symptom_tags" | "feeling_tags" | "gear_tags") {
    if (!value) return;
    const updated = current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag];
    onChange({ ...value, [field]: updated });
  }

  function setMemo(memo: string) {
    if (!value) return;
    onChange({ ...value, memo: memo || null });
  }

  function handleClear() {
    onChange(null);
  }

  const condition = value?.condition ?? null;
  const tagSet = condition ? getTagsByCondition(condition) : null;

  return (
    <div className="flex flex-col gap-3 pt-2">
      {/* Condition selector */}
      <div>
        <p className="text-xs font-bold mb-1.5">調子は？</p>
        <div className="flex gap-2">
          {conditionOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setCondition(opt.value)}
              className={`flex-1 rounded-lg border-2 py-1.5 text-center ${
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
              <p className="text-xs font-bold mb-1.5">何が良かった？</p>
              <div className="flex flex-wrap gap-1.5">
                {tagSet.goodTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag, value?.symptom_tags ?? [], "symptom_tags")}
                    className={`rounded-full px-3 py-1 text-xs ${
                      value?.symptom_tags.includes(tag)
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
              <p className="text-xs font-bold mb-1.5">何が起きた？</p>
              {tagSet.symptomTags.map((cat) => (
                <div key={cat.label} className="mb-1.5">
                  <p className="text-xs text-[#8b8b8b] mb-1">{cat.label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag, value?.symptom_tags ?? [], "symptom_tags")}
                        className={`rounded-full px-3 py-1 text-xs ${
                          value?.symptom_tags.includes(tag)
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
              <p className="text-xs font-bold mb-1.5">体の感覚</p>
              <div className="flex flex-wrap gap-1.5">
                {tagSet.feelingTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag, value?.feeling_tags ?? [], "feeling_tags")}
                    className={`rounded-full px-3 py-1 text-xs ${
                      value?.feeling_tags.includes(tag)
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
              <p className="text-xs font-bold mb-1.5">ギアの気づき</p>
              <div className="flex flex-wrap gap-1.5">
                {tagSet.gearTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag, value?.gear_tags ?? [], "gear_tags")}
                    className={`rounded-full px-3 py-1 text-xs ${
                      value?.gear_tags.includes(tag)
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

      {/* Memo text */}
      {condition && (
        <div>
          <p className="text-xs font-bold mb-1">メモ（任意）</p>
          <textarea
            value={value?.memo ?? ""}
            onChange={(e) => setMemo(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]"
          />
        </div>
      )}

      {/* Clear button */}
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="self-start text-xs text-[#8b8b8b] underline"
        >
          メモをクリア
        </button>
      )}
    </div>
  );
}

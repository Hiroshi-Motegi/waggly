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

export const conditionOptions: { value: MemoCondition; image: string; label: string }[] = [
  { value: "bad", image: "/images/face-bad.png", label: "Bad..." },
  { value: "normal", image: "/images/face-ok.png", label: "OK" },
  { value: "good", image: "/images/face-good.png", label: "Good!" },
];

export function getConditionImage(condition: MemoCondition): string {
  return conditionOptions.find((o) => o.value === condition)?.image ?? "/images/face-ok.png";
}

export function getConditionLabel(condition: MemoCondition): string {
  return conditionOptions.find((o) => o.value === condition)?.label ?? "OK";
}

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
      <div className="flex gap-2 py-1.5">
        {conditionOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setCondition(opt.value)}
            className={`flex-1 flex flex-col gap-[7px] items-center rounded p-2 border ${
              condition === opt.value
                ? opt.value === "good" ? "border-[#ffc107] bg-[#fff4d2]"
                  : "border-[#bebebe] bg-white"
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
                    onClick={() => toggleTag(tag, value?.symptom_tags ?? [], "symptom_tags")}
                    className={`rounded-full px-[13px] py-1 text-xs font-bold ${
                      value?.symptom_tags.includes(tag)
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
                        onClick={() => toggleTag(tag, value?.symptom_tags ?? [], "symptom_tags")}
                        className={`rounded-full px-[13px] py-1 text-xs font-bold ${
                          value?.symptom_tags.includes(tag)
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
                    onClick={() => toggleTag(tag, value?.feeling_tags ?? [], "feeling_tags")}
                    className={`rounded-full px-[13px] py-1 text-xs font-bold ${
                      value?.feeling_tags.includes(tag)
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
                    onClick={() => toggleTag(tag, value?.gear_tags ?? [], "gear_tags")}
                    className={`rounded-full px-[13px] py-1 text-xs font-bold ${
                      value?.gear_tags.includes(tag)
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

      {/* Memo text */}
      {condition && (
        <div className="flex flex-col gap-0.5 py-1">
          <p className="text-xs">所感・メモ</p>
          <textarea
            value={value?.memo ?? ""}
            onChange={(e) => setMemo(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]"
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

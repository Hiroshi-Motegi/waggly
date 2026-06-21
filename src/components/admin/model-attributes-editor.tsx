"use client";

interface ModelAttribute {
  id?: string;
  label: string;
  value: string;
  sort_order: number;
}

interface ModelAttributesEditorProps {
  attributes: ModelAttribute[];
  onChange: (attributes: ModelAttribute[]) => void;
}

export function ModelAttributesEditor({ attributes, onChange }: ModelAttributesEditorProps) {
  function updateAttr(idx: number, field: "label" | "value", val: string) {
    const updated = [...attributes];
    updated[idx] = { ...updated[idx], [field]: val };
    onChange(updated);
  }

  function addAttr() {
    onChange([...attributes, { label: "", value: "", sort_order: attributes.length }]);
  }

  function removeAttr(idx: number) {
    onChange(attributes.filter((_, i) => i !== idx).map((a, i) => ({ ...a, sort_order: i })));
  }

  function moveAttr(idx: number, direction: -1 | 1) {
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= attributes.length) return;
    const updated = [...attributes];
    [updated[idx], updated[swapIdx]] = [updated[swapIdx], updated[idx]];
    onChange(updated.map((a, i) => ({ ...a, sort_order: i })));
  }

  return (
    <div className="space-y-2">
      {attributes.map((attr, idx) => (
        <div key={idx} className="flex gap-2">
          <div className="flex flex-col gap-0.5">
            <button onClick={() => moveAttr(idx, -1)} className="text-[10px] text-[#888] hover:text-black leading-none">↑</button>
            <button onClick={() => moveAttr(idx, 1)} className="text-[10px] text-[#888] hover:text-black leading-none">↓</button>
          </div>
          <input
            value={attr.label}
            onChange={(e) => updateAttr(idx, "label", e.target.value)}
            placeholder="見出し (例: ルールの適合/不適合)"
            className="w-48 rounded-md border border-input px-2 py-1.5 text-xs"
          />
          <textarea
            value={attr.value}
            onChange={(e) => updateAttr(idx, "value", e.target.value)}
            placeholder="内容 (Markdown対応)"
            rows={2}
            className="flex-1 rounded-md border border-input px-2 py-1.5 text-xs"
          />
          <button onClick={() => removeAttr(idx)} className="self-start text-red-500 hover:text-red-700 text-xs mt-1">削除</button>
        </div>
      ))}
      <button onClick={addAttr} className="text-xs font-bold text-[#006728] hover:underline">
        ＋ 行追加
      </button>
    </div>
  );
}

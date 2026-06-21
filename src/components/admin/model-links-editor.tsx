"use client";

interface ModelLink {
  id?: string;
  label: string;
  url: string;
  sort_order: number;
}

interface ModelLinksEditorProps {
  links: ModelLink[];
  onChange: (links: ModelLink[]) => void;
}

export function ModelLinksEditor({ links, onChange }: ModelLinksEditorProps) {
  function updateLink(idx: number, field: keyof ModelLink, value: string) {
    const updated = [...links];
    updated[idx] = { ...updated[idx], [field]: value };
    onChange(updated);
  }

  function addLink() {
    onChange([...links, { label: "", url: "", sort_order: links.length }]);
  }

  function removeLink(idx: number) {
    onChange(links.filter((_, i) => i !== idx).map((l, i) => ({ ...l, sort_order: i })));
  }

  function moveLink(idx: number, direction: -1 | 1) {
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= links.length) return;
    const updated = [...links];
    [updated[idx], updated[swapIdx]] = [updated[swapIdx], updated[idx]];
    onChange(updated.map((l, i) => ({ ...l, sort_order: i })));
  }

  return (
    <div className="space-y-2">
      {links.map((link, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <div className="flex flex-col gap-0.5">
            <button onClick={() => moveLink(idx, -1)} className="text-[10px] text-[#888] hover:text-black leading-none">↑</button>
            <button onClick={() => moveLink(idx, 1)} className="text-[10px] text-[#888] hover:text-black leading-none">↓</button>
          </div>
          <input
            value={link.label}
            onChange={(e) => updateLink(idx, "label", e.target.value)}
            placeholder="ラベル (例: Amazon)"
            className="w-32 rounded-md border border-input px-2 py-1.5 text-xs"
          />
          <input
            value={link.url}
            onChange={(e) => updateLink(idx, "url", e.target.value)}
            placeholder="URL"
            className="flex-1 rounded-md border border-input px-2 py-1.5 text-xs font-mono"
          />
          <button onClick={() => removeLink(idx)} className="text-red-500 hover:text-red-700 text-xs">削除</button>
        </div>
      ))}
      <button onClick={addLink} className="text-xs font-bold text-[#006728] hover:underline">
        ＋ リンク追加
      </button>
    </div>
  );
}

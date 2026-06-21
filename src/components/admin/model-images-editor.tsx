"use client";

import { useRef } from "react";
import { apiFetch } from "@/lib/api-client";

interface ModelImage {
  id: string;
  image_url: string;
  sort_order: number;
}

interface ModelImagesEditorProps {
  modelId: string;
  images: ModelImage[];
  onMutate: () => void;
}

export function ModelImagesEditor({ modelId, images, onMutate }: ModelImagesEditorProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(files: FileList) {
    // Upload sequentially — each upload sets sort_order based on existing count,
    // so parallel uploads could cause sort_order conflicts
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("model_id", modelId);
      formData.append("file", file);
      await apiFetch("/api/admin/catalog/model-images", { method: "POST", body: formData });
    }
    onMutate();
  }

  async function handleDelete(id: string) {
    if (!confirm("画像を削除しますか？")) return;
    await apiFetch("/api/admin/catalog/model-images", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    onMutate();
  }

  async function handleReorder(fromIdx: number, toIdx: number) {
    const reordered = [...images];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const updates = reordered.map((img, i) => ({ id: img.id, sort_order: i }));
    await apiFetch("/api/admin/catalog/model-images", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    onMutate();
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-3">
        {images.map((img, idx) => (
          <div key={img.id} className="relative group rounded-lg border border-[#e5e5e5] overflow-hidden">
            <img src={img.image_url} alt="" className="w-full h-24 object-cover" />
            {idx === 0 && (
              <span className="absolute top-1 left-1 rounded bg-[#006728] px-1.5 py-0.5 text-[9px] font-bold text-white">
                メイン
              </span>
            )}
            <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition">
              {idx > 0 && (
                <button
                  onClick={() => handleReorder(idx, idx - 1)}
                  className="rounded bg-white/80 px-1.5 py-0.5 text-[10px] shadow hover:bg-white"
                >
                  ←
                </button>
              )}
              {idx < images.length - 1 && (
                <button
                  onClick={() => handleReorder(idx, idx + 1)}
                  className="rounded bg-white/80 px-1.5 py-0.5 text-[10px] shadow hover:bg-white"
                >
                  →
                </button>
              )}
              <button
                onClick={() => handleDelete(img.id)}
                className="rounded bg-red-600/80 px-1.5 py-0.5 text-[10px] text-white shadow hover:bg-red-600"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleUpload(e.target.files)}
      />
      <button
        onClick={() => fileRef.current?.click()}
        className="rounded border border-dashed border-[#ccc] px-4 py-2 text-xs text-[#888] hover:border-[#006728] hover:text-[#006728]"
      >
        ＋ 画像を追加
      </button>
    </div>
  );
}

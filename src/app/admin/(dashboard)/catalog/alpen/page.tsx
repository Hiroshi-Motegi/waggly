"use client";

import { useState, useEffect } from "react";
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";

interface CatalogModel {
  id: string;
  name: string;
  maker: string;
  maker_slug: string;
  slug: string;
  category: string;
  alpen_pid: string | null;
  image_url: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  driver: "ドライバー",
  fairway_wood: "FW",
  utility: "UT",
  iron: "アイアン",
  wedge: "ウェッジ",
  putter: "パター",
};

export default function AlpenPidPage() {
  const [models, setModels] = useState<CatalogModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [pidFilter, setPidFilter] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPid, setEditPid] = useState("");
  const [saving, setSaving] = useState(false);

  async function fetchModels() {
    setLoading(true);
    const params = new URLSearchParams();
    if (categoryFilter) params.set("category", categoryFilter);
    if (pidFilter) params.set("pid_status", pidFilter);

    const res = await fetch(`/api/admin/catalog/alpen-pid?${params}`);
    if (res.ok) setModels(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchModels(); }, [categoryFilter, pidFilter]);

  async function savePid(modelId: string) {
    setSaving(true);
    await fetch("/api/admin/catalog/alpen-pid", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model_id: modelId, alpen_pid: editPid.trim() }),
    });
    setSaving(false);
    setEditingId(null);
    fetchModels();
  }

  function alpenSearchUrl(model: CatalogModel) {
    const query = `${model.maker} ${model.name}`
      .replace(/ドライバー|フェアウェイウッド|ユーティリティ|アイアン|ウェッジ|パター/g, "")
      .trim();
    return `https://store.alpen-group.jp/Form/Product/ProductList.aspx?cat=113001&swrd=${encodeURIComponent(query)}`;
  }

  function alpenImageUrl(pid: string) {
    return `https://img.alpen-group.jp/Contents/ProductImages/0/${pid}_L.jpg`;
  }

  const stats = {
    total: models.length,
    hasPid: models.filter((m) => m.alpen_pid).length,
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <AdminBreadcrumb items={[
        { label: "カタログ", href: "/admin/catalog" },
        { label: "アルペンPID管理" },
      ]} />

      <h1 className="text-xl font-bold mb-4">アルペンPID管理</h1>

      <div className="mb-4 text-sm text-gray-600">
        表示: {stats.total}件 / PID設定済み: {stats.hasPid}件
        ({stats.total > 0 ? ((stats.hasPid / stats.total) * 100).toFixed(1) : 0}%)
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="">全カテゴリ</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={pidFilter}
          onChange={(e) => setPidFilter(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="">PID全て</option>
          <option value="has">設定済み</option>
          <option value="missing">未設定</option>
        </select>
      </div>

      {loading ? (
        <p className="text-gray-500">読み込み中...</p>
      ) : (
        <div className="space-y-2">
          {models.map((model) => (
            <div key={model.id} className="border rounded-lg p-3 bg-white">
              <div className="flex items-start gap-3">
                <div className="w-16 h-16 shrink-0 bg-gray-100 rounded overflow-hidden">
                  {model.alpen_pid ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={alpenImageUrl(model.alpen_pid)}
                      alt=""
                      className="w-full h-full object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                      No PID
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{model.maker}</span>
                    <span className="text-xs bg-green-100 text-green-700 rounded px-1">
                      {CATEGORY_LABELS[model.category] ?? model.category}
                    </span>
                    {model.alpen_pid && (
                      <span className="text-xs bg-blue-100 text-blue-700 rounded px-1">PID済</span>
                    )}
                  </div>
                  <p className="font-bold text-sm truncate">{model.name}</p>

                  {editingId === model.id ? (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="text"
                        value={editPid}
                        onChange={(e) => setEditPid(e.target.value)}
                        placeholder="PID (例: 6011860415-0001)"
                        className="border rounded px-2 py-1 text-sm flex-1"
                      />
                      <button
                        onClick={() => savePid(model.id)}
                        disabled={saving}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-gray-500 px-2 py-1 text-sm"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400">
                        {model.alpen_pid ?? "PID未設定"}
                      </span>
                      <button
                        onClick={() => { setEditingId(model.id); setEditPid(model.alpen_pid ?? ""); }}
                        className="text-blue-600 text-xs underline"
                      >
                        編集
                      </button>
                    </div>
                  )}
                </div>

                <a
                  href={alpenSearchUrl(model)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-xs text-blue-600 underline whitespace-nowrap"
                >
                  アルペンで検索
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

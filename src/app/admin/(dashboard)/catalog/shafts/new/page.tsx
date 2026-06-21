"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";
import { AdminFormSection } from "@/components/admin/admin-form-section";
import { apiFetch } from "@/lib/api-client";

const FLEX_PRESETS = ["R", "SR", "S", "X", "L", "A", "S200", "S300", "S400", "R300", "R400"];

const SPEC_ROWS = [
  { key: "shaft_weight", label: "重量(g)", type: "number" as const },
  { key: "torque", label: "トルク(°)", type: "number" as const },
  { key: "kick_point", label: "キックポイント", type: "text" as const },
];

interface FlexData {
  shaft_weight: number | null;
  torque: number | null;
  kick_point: string;
}

function ShaftNewForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    shaft_name: "",
    maker: "",
    shaft_type: "" as string | null,
  });
  const [flexes, setFlexes] = useState<string[]>([]);
  const [flexData, setFlexData] = useState<Record<string, FlexData>>({});
  const [newFlex, setNewFlex] = useState("");

  function addFlex(flex: string) {
    if (!flex || flexes.includes(flex)) return;
    setFlexes([...flexes, flex]);
    setFlexData({ ...flexData, [flex]: { shaft_weight: null, torque: null, kick_point: "" } });
  }

  function removeFlex(flex: string) {
    setFlexes(flexes.filter((f) => f !== flex));
    const next = { ...flexData };
    delete next[flex];
    setFlexData(next);
  }

  function updateCell(flex: string, key: string, value: string) {
    const spec = flexData[flex];
    if (!spec) return;
    if (key === "shaft_weight" || key === "torque") {
      setFlexData({ ...flexData, [flex]: { ...spec, [key]: value ? Number(value) : null } });
    } else {
      setFlexData({ ...flexData, [flex]: { ...spec, [key]: value } });
    }
  }

  function handleAddNewFlex() {
    const trimmed = newFlex.trim();
    if (trimmed) { addFlex(trimmed); setNewFlex(""); }
  }

  async function handleSave() {
    if (!form.shaft_name || flexes.length === 0) return;
    setSaving(true);
    try {
      const results = await Promise.all(
        flexes.map((flex) =>
          apiFetch("/api/admin/catalog/shafts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              shaft_name: form.shaft_name,
              maker: form.maker || null,
              shaft_type: form.shaft_type || null,
              flex,
              shaft_weight: flexData[flex]?.shaft_weight ?? null,
              torque: flexData[flex]?.torque ?? null,
              kick_point: flexData[flex]?.kick_point || null,
            }),
          })
        )
      );
      if (results.every((r) => r.ok)) {
        router.push("/admin/catalog/shafts");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 p-4">
      <AdminBreadcrumb items={[
        { label: "カタログ", href: "/admin/catalog" },
        { label: "シャフト管理", href: "/admin/catalog/shafts" },
        { label: "新規追加" },
      ]} />
      <h1 className="text-xl font-bold">シャフト新規追加</h1>

      <AdminFormSection title="シャフト共通情報">
        <div className="grid grid-cols-3 gap-3">
          <label className="block text-xs font-bold text-[#555]">
            シャフト名 *
            <input
              value={form.shaft_name}
              onChange={(e) => setForm({ ...form, shaft_name: e.target.value })}
              placeholder="例: Speeder NX 50"
              className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-bold text-[#555]">
            メーカー
            <input
              value={form.maker}
              onChange={(e) => setForm({ ...form, maker: e.target.value })}
              placeholder="例: フジクラ"
              className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-bold text-[#555]">
            種類
            <select
              value={form.shaft_type ?? ""}
              onChange={(e) => setForm({ ...form, shaft_type: e.target.value || null })}
              className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm"
            >
              <option value="">未設定</option>
              <option value="カーボンシャフト">カーボンシャフト</option>
              <option value="スチールシャフト">スチールシャフト</option>
            </select>
          </label>
        </div>
      </AdminFormSection>

      <AdminFormSection title="フレックス別スペック">
        {/* Flex preset buttons */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {FLEX_PRESETS.map((flex) => (
            <button
              key={flex}
              type="button"
              onClick={() => flexes.includes(flex) ? removeFlex(flex) : addFlex(flex)}
              className={`rounded-full px-2.5 py-0.5 text-xs border ${
                flexes.includes(flex)
                  ? "bg-[#006728] text-white border-[#006728]"
                  : "bg-white text-[#555] border-[#ddd] hover:border-[#006728]"
              }`}
            >
              {flex}
            </button>
          ))}
        </div>

        {/* Horizontal spec grid */}
        {flexes.length > 0 && (
          <div className="overflow-x-auto">
            <table className="text-sm border-collapse">
              <thead>
                <tr>
                  <th className="border border-[#e5e5e5] bg-[#fafafa] px-3 py-2 text-left text-[11px] text-[#888] font-medium min-w-[120px]">
                    スペック項目
                  </th>
                  {flexes.map((flex) => (
                    <th key={flex} className="border border-[#e5e5e5] bg-[#fafafa] px-3 py-2 text-center text-[11px] font-medium min-w-[80px]">
                      <div className="flex items-center justify-center gap-1">
                        {flex}
                        <button
                          type="button"
                          onClick={() => removeFlex(flex)}
                          className="text-[#ccc] hover:text-red-600 text-xs"
                        >
                          &times;
                        </button>
                      </div>
                    </th>
                  ))}
                  <th className="border border-[#e5e5e5] bg-[#fafafa] px-2 py-2">
                    <div className="flex items-center gap-1">
                      <input
                        value={newFlex}
                        onChange={(e) => setNewFlex(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddNewFlex())}
                        placeholder="フレックス"
                        className="w-16 rounded border border-input px-1 py-0.5 text-[11px]"
                      />
                      <button type="button" onClick={handleAddNewFlex} className="text-[#006728] text-xs font-bold">+</button>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {SPEC_ROWS.map((row) => (
                  <tr key={row.key}>
                    <td className="border border-[#e5e5e5] bg-[#fafafa] px-3 py-1.5 text-xs font-medium text-[#555]">
                      {row.label}
                    </td>
                    {flexes.map((flex) => (
                      <td key={flex} className="border border-[#e5e5e5] px-1 py-0.5">
                        <input
                          type={row.type}
                          step={row.type === "number" ? "any" : undefined}
                          value={
                            row.key === "kick_point"
                              ? flexData[flex]?.kick_point ?? ""
                              : (flexData[flex]?.[row.key as "shaft_weight" | "torque"] ?? "")
                          }
                          onChange={(e) => updateCell(flex, row.key, e.target.value)}
                          className="w-full text-center text-xs px-1 py-1 bg-transparent focus:bg-white focus:outline focus:outline-[#006728] rounded"
                          placeholder="-"
                        />
                      </td>
                    ))}
                    <td className="border border-[#e5e5e5]" />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {flexes.length === 0 && (
          <p className="text-xs text-[#aaa] py-4 text-center">上のボタンからフレックスを選択してください</p>
        )}
      </AdminFormSection>

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !form.shaft_name || flexes.length === 0}
          className="rounded bg-[#006728] px-6 py-2 text-sm font-bold text-white hover:bg-[#005520] disabled:opacity-50"
        >
          {saving ? "保存中..." : `${flexes.length}件を一括登録`}
        </button>
        <button
          onClick={() => router.push("/admin/catalog/shafts")}
          className="rounded border border-[#ddd] px-6 py-2 text-sm hover:bg-[#f5f5f5]"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}

export default function ShaftNewPage() {
  return <Suspense><ShaftNewForm /></Suspense>;
}

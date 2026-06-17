"use client";

import { useState } from "react";
import type { CatalogModelWithSpecs, CatalogSpec } from "@/lib/catalog";
import { SPEC_LABELS, CATEGORY_SPECS, type SpecKey } from "./spec-table";

interface CompareTableProps {
  modelA: CatalogModelWithSpecs;
  modelB: CatalogModelWithSpecs;
}

type ViewMode = "by-club" | "by-spec";

export function CompareTable({ modelA, modelB }: CompareTableProps) {
  const [view, setView] = useState<ViewMode>("by-club");
  const [activeSpecKey, setActiveSpecKey] = useState<SpecKey | null>(null);
  const category = modelA.category;
  const specKeys = CATEGORY_SPECS[category] ?? (Object.keys(SPEC_LABELS) as SpecKey[]);

  const allNumbers = Array.from(
    new Set([
      ...modelA.catalog_specs.map((s) => s.club_number),
      ...modelB.catalog_specs.map((s) => s.club_number),
    ])
  );
  const orderMap = new Map<string, number>();
  [...modelA.catalog_specs, ...modelB.catalog_specs].forEach((s) => {
    if (!orderMap.has(s.club_number)) orderMap.set(s.club_number, s.sort_order);
  });
  allNumbers.sort((a, b) => (orderMap.get(a) ?? 999) - (orderMap.get(b) ?? 999));

  const specMapA = new Map<string, CatalogSpec>(modelA.catalog_specs.map((s) => [s.club_number, s]));
  const specMapB = new Map<string, CatalogSpec>(modelB.catalog_specs.map((s) => [s.club_number, s]));

  const nameA = `${modelA.catalog_series.maker} ${modelA.catalog_series.name}`;
  const nameB = `${modelB.catalog_series.maker} ${modelB.catalog_series.name}`;

  // データがある項目だけフィルタ
  const availableKeys = specKeys.filter((key) =>
    allNumbers.some((cn) => {
      const a = specMapA.get(cn);
      const b = specMapB.get(cn);
      return (a && a[key] != null) || (b && b[key] != null);
    })
  );

  // 初期値設定
  const currentSpecKey = activeSpecKey ?? availableKeys[0] ?? specKeys[0];

  return (
    <div>
      {/* View toggle */}
      <div className="flex gap-2 px-4 py-3 bg-[#f5f5f5] border-b border-[#e0e0e0]">
        <button
          onClick={() => setView("by-club")}
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            view === "by-club" ? "bg-[#006728] text-white" : "bg-white text-[#666] border border-[#ddd]"
          }`}
        >
          番手別
        </button>
        <button
          onClick={() => setView("by-spec")}
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            view === "by-spec" ? "bg-[#006728] text-white" : "bg-white text-[#666] border border-[#ddd]"
          }`}
        >
          項目別
        </button>
      </div>

      {/* 項目タブ（項目別ビュー時のみ表示） */}
      {view === "by-spec" && availableKeys.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 py-3 border-b border-[#e0e0e0]">
          {availableKeys.map((key) => (
            <button
              key={key}
              onClick={() => setActiveSpecKey(key)}
              className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                currentSpecKey === key
                  ? "bg-[#006728] text-white"
                  : "bg-white text-[#666] border border-[#ddd] hover:border-[#006728] hover:text-[#006728]"
              }`}
            >
              {SPEC_LABELS[key]}
            </button>
          ))}
        </div>
      )}

      {/* SSR用：全データを非表示で展開（Googleクローラー向け） */}
      <div className="sr-only" aria-hidden="false">
        {availableKeys.map((key) => (
          <section key={key}>
            <h3>{SPEC_LABELS[key]}比較</h3>
            <table>
              <thead>
                <tr><th>番手</th><th>{nameA}</th><th>{nameB}</th></tr>
              </thead>
              <tbody>
                {allNumbers.map((cn) => {
                  const valA = specMapA.get(cn)?.[key];
                  const valB = specMapB.get(cn)?.[key];
                  if (valA == null && valB == null) return null;
                  return (
                    <tr key={cn}>
                      <td>{cn}</td>
                      <td>{valA != null ? String(valA) : "—"}</td>
                      <td>{valB != null ? String(valB) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        ))}
      </div>

      {/* ユーザー向け表示 */}
      {view === "by-club" ? (
        <ByClubView
          allNumbers={allNumbers} specKeys={specKeys}
          specMapA={specMapA} specMapB={specMapB}
          nameA={nameA} nameB={nameB}
        />
      ) : (
        <BySpecView
          allNumbers={allNumbers} activeKey={currentSpecKey}
          specMapA={specMapA} specMapB={specMapB}
          nameA={nameA} nameB={nameB}
        />
      )}
    </div>
  );
}

/** 番手別：番手ごとに全項目を A vs B で比較 */
function ByClubView({
  allNumbers, specKeys, specMapA, specMapB, nameA, nameB,
}: {
  allNumbers: string[];
  specKeys: SpecKey[];
  specMapA: Map<string, CatalogSpec>;
  specMapB: Map<string, CatalogSpec>;
  nameA: string;
  nameB: string;
}) {
  return (
    <div className="divide-y divide-[#e0e0e0]">
      {allNumbers.map((clubNumber) => {
        const specA = specMapA.get(clubNumber);
        const specB = specMapB.get(clubNumber);
        return (
          <div key={clubNumber} className="px-4 py-3">
            <h3 className="text-sm font-bold text-[#006728] mb-2">{clubNumber}</h3>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#e0e0e0]">
                  <th className="text-left py-1 pr-2 text-[#888] font-medium w-1/3">項目</th>
                  <th className="text-center py-1 px-2 text-[#333] font-bold w-1/3">{nameA}</th>
                  <th className="text-center py-1 pl-2 text-[#333] font-bold w-1/3">{nameB}</th>
                </tr>
              </thead>
              <tbody>
                {specKeys.map((key) => {
                  const valA = specA ? specA[key] : null;
                  const valB = specB ? specB[key] : null;
                  if (valA == null && valB == null) return null;
                  const diff = typeof valA === "number" && typeof valB === "number" ? valA !== valB : false;
                  return (
                    <tr key={key} className="border-b border-[#f0f0f0]">
                      <td className="py-1.5 pr-2 text-[#666]">{SPEC_LABELS[key]}</td>
                      <td className={`py-1.5 px-2 text-center ${diff ? "font-bold text-[#222]" : "text-[#444]"}`}>
                        {valA != null ? String(valA) : "—"}
                      </td>
                      <td className={`py-1.5 pl-2 text-center ${diff ? "font-bold text-[#222]" : "text-[#444]"}`}>
                        {valB != null ? String(valB) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

/** 項目別：選択中の項目で全番手を表示 */
function BySpecView({
  allNumbers, activeKey, specMapA, specMapB, nameA, nameB,
}: {
  allNumbers: string[];
  activeKey: SpecKey;
  specMapA: Map<string, CatalogSpec>;
  specMapB: Map<string, CatalogSpec>;
  nameA: string;
  nameB: string;
}) {
  return (
    <div className="px-4 py-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-[#e0e0e0]">
              <th className="text-left py-2 pr-3 text-[#888] font-medium w-[60px]">番手</th>
              <th className="text-center py-2 px-3 text-[#333] font-bold">{nameA}</th>
              <th className="text-center py-2 px-3 text-[#333] font-bold">{nameB}</th>
              <th className="text-center py-2 pl-3 text-[#888] font-medium w-[60px]">差</th>
            </tr>
          </thead>
          <tbody>
            {allNumbers.map((clubNumber) => {
              const specA = specMapA.get(clubNumber);
              const specB = specMapB.get(clubNumber);
              const valA = specA ? specA[activeKey] : null;
              const valB = specB ? specB[activeKey] : null;
              if (valA == null && valB == null) return null;

              let diffStr = "—";
              if (typeof valA === "number" && typeof valB === "number") {
                const d = valA - valB;
                if (d !== 0) diffStr = (d > 0 ? "+" : "") + d.toFixed(d % 1 === 0 ? 0 : 1);
                else diffStr = "同じ";
              }

              return (
                <tr key={clubNumber} className="border-b border-[#f0f0f0]">
                  <td className="py-2 pr-3 font-bold text-[#555]">{clubNumber}</td>
                  <td className="py-2 px-3 text-center text-[#444]">
                    {valA != null ? String(valA) : "—"}
                  </td>
                  <td className="py-2 px-3 text-center text-[#444]">
                    {valB != null ? String(valB) : "—"}
                  </td>
                  <td className={`py-2 pl-3 text-center text-xs font-bold ${
                    diffStr.startsWith("+") ? "text-red-500" : diffStr.startsWith("-") ? "text-blue-500" : "text-[#aaa]"
                  }`}>
                    {diffStr}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import type { CatalogModelWithSpecs, CatalogSpec } from "@/lib/catalog";
import type { NewsItem } from "@/lib/catalog-news";
import { SPEC_LABELS, CATEGORY_SPECS, type SpecKey } from "./spec-table";

interface CompareTableProps {
  modelA: CatalogModelWithSpecs;
  modelB: CatalogModelWithSpecs;
  news?: NewsItem[];
}

type ViewMode = "by-club" | "by-spec" | "news";

export function CompareTable({ modelA, modelB, news = [] }: CompareTableProps) {
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

  const nameA = `${modelA.catalog_series.name}`;
  const nameB = `${modelB.catalog_series.name}`;

  const availableKeys = specKeys.filter((key) =>
    allNumbers.some((cn) => {
      const a = specMapA.get(cn);
      const b = specMapB.get(cn);
      return (a && a[key] != null) || (b && b[key] != null);
    })
  );

  const currentSpecKey = activeSpecKey ?? availableKeys[0] ?? specKeys[0];

  const tabs: { value: ViewMode; label: string }[] = [
    { value: "by-club", label: "番手順" },
    { value: "by-spec", label: "項目別" },
    { value: "news", label: "関連情報" },
  ];

  return (
    <div className="w-full">
      {/* Main view tabs */}
      <div className="flex justify-center gap-2.5 px-3 pt-5 pb-2.5">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setView(tab.value)}
            className={`rounded-full border border-white px-5 py-2.5 text-sm font-bold transition-colors ${
              view === tab.value
                ? "bg-[#17552f] text-white"
                : "bg-white text-[#016729]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Spec sub-tabs (項目別 only) */}
      {view === "by-spec" && availableKeys.length > 0 && (
        <div className="flex items-center gap-1 px-3 pt-2 overflow-x-auto scrollbar-hide">
          {availableKeys.map((key) => (
            <button
              key={key}
              onClick={() => setActiveSpecKey(key)}
              className={`shrink-0 rounded-full px-3 py-2.5 text-sm font-bold whitespace-nowrap transition-colors ${
                currentSpecKey === key
                  ? "bg-[#17552f] border border-white text-white"
                  : "text-white"
              }`}
            >
              {SPEC_LABELS[key]}
            </button>
          ))}
        </div>
      )}

      {/* Content area */}
      <div className="px-3 pt-1.5 pb-3">
        {view === "by-club" && (
          <ByClubView
            allNumbers={allNumbers} specKeys={specKeys}
            specMapA={specMapA} specMapB={specMapB}
            nameA={nameA} nameB={nameB}
          />
        )}
        {view === "by-spec" && (
          <BySpecView
            allNumbers={allNumbers} activeKey={currentSpecKey}
            specMapA={specMapA} specMapB={specMapB}
            nameA={nameA} nameB={nameB}
          />
        )}
        {view === "news" && (
          <>
            <p className="text-sm text-white/80 leading-relaxed mb-2">
              ※ 関連情報の収集にはAIを利用しており、内容が正確でない場合があります。
            </p>
            <div className="flex flex-col gap-2">
              {news.length === 0 ? (
                <div className="rounded-md bg-white p-4 text-center">
                  <p className="text-sm text-[#888]">関連ニュースが見つかりませんでした</p>
                </div>
              ) : (
                news.map((item, i) => (
                  <a
                    key={i}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col gap-1 rounded-md bg-white p-3"
                  >
                    <p className="text-sm font-bold text-[#006728] leading-snug">{item.title}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#888]">{item.source}</span>
                      {item.date && (
                        <span className="text-xs text-[#aaa]">
                          {new Date(item.date).toLocaleDateString("ja-JP")}
                        </span>
                      )}
                    </div>
                  </a>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* SEO: sr-only full data for crawlers */}
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
    <div className="flex flex-col gap-3">
      {allNumbers.map((clubNumber) => {
        const specA = specMapA.get(clubNumber);
        const specB = specMapB.get(clubNumber);
        return (
          <div key={clubNumber} className="rounded-md bg-white overflow-hidden">
            <div className="bg-[#006728] px-3 py-1.5">
              <h3 className="text-sm font-bold text-white">{clubNumber}</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#cbcbcb]">
                  <th className="text-left p-1 pl-3 text-[#6b6b6b] font-bold text-sm w-[79px]">項目</th>
                  <th className="text-center p-1 text-[#6b6b6b] font-bold text-sm">{nameA}</th>
                  <th className="text-center p-1 text-[#6b6b6b] font-bold text-sm">{nameB}</th>
                  <th className="text-center p-1 pr-3 text-[#6b6b6b] font-bold text-sm w-[53px]">差</th>
                </tr>
              </thead>
              <tbody>
                {specKeys.map((key) => {
                  const valA = specA ? specA[key] : null;
                  const valB = specB ? specB[key] : null;
                  if (valA == null && valB == null) return null;

                  let diffStr = "—";
                  if (typeof valA === "number" && typeof valB === "number") {
                    const d = valA - valB;
                    if (d !== 0) diffStr = (d > 0 ? "+" : "") + d.toFixed(d % 1 === 0 ? 0 : 1);
                    else diffStr = "-";
                  }

                  return (
                    <tr key={key} className="border-b border-[#cbcbcb] last:border-0">
                      <td className="py-2 px-1 pl-3 text-[#6b6b6b] text-sm whitespace-nowrap">{SPEC_LABELS[key]}</td>
                      <td className="py-2 px-1 text-center text-[#6b6b6b] text-sm">{valA != null ? String(valA) : "—"}</td>
                      <td className="py-2 px-1 text-center text-[#6b6b6b] text-sm">{valB != null ? String(valB) : "—"}</td>
                      <td className={`py-2 px-1 pr-3 text-center text-sm ${
                        diffStr.startsWith("+") ? "text-red-500 font-bold" : diffStr.startsWith("-") && diffStr !== "-" ? "text-blue-500 font-bold" : "text-[#6b6b6b]"
                      }`}>
                        {diffStr}
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
    <div className="rounded-md bg-white overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#cbcbcb]">
            <th className="text-left p-1 pl-3 py-2 text-[#6b6b6b] font-bold w-[79px]">番手</th>
            <th className="text-center p-1 py-2 text-[#6b6b6b] font-bold">{nameA}</th>
            <th className="text-center p-1 py-2 text-[#6b6b6b] font-bold">{nameB}</th>
            <th className="text-center p-1 pr-3 py-2 text-[#6b6b6b] font-bold w-[53px]">差</th>
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
              else diffStr = "-";
            }

            return (
              <tr key={clubNumber} className="border-b border-[#cbcbcb] last:border-0">
                <td className="py-2 px-1 pl-3 text-[#6b6b6b]">{clubNumber}</td>
                <td className="py-2 px-1 text-center text-[#6b6b6b]">{valA != null ? String(valA) : "—"}</td>
                <td className="py-2 px-1 text-center text-[#6b6b6b]">{valB != null ? String(valB) : "—"}</td>
                <td className={`py-2 px-1 pr-3 text-center text-sm ${
                  diffStr.startsWith("+") ? "text-red-500 font-bold" : diffStr.startsWith("-") && diffStr !== "-" ? "text-blue-500 font-bold" : "text-[#6b6b6b]"
                }`}>
                  {diffStr}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

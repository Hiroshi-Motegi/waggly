"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const SPEC_CATEGORIES = [
  { value: "", label: "すべて" },
  { value: "driver", label: "ドライバー" },
  { value: "fairway_wood", label: "フェアウェイウッド" },
  { value: "utility", label: "ユーティリティ" },
  { value: "iron", label: "アイアン" },
  { value: "wedge", label: "ウェッジ" },
  { value: "putter", label: "パター" },
];

interface NavItem {
  href: string;
  label: string;
  match: (pathname: string, searchParams: URLSearchParams) => boolean;
}

export function AdminSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const specItems: NavItem[] = SPEC_CATEGORIES.map((cat) => ({
    href: cat.value ? `/admin/specs?category=${cat.value}` : "/admin/specs",
    label: cat.label,
    match: (p, sp) => p.startsWith("/admin/specs") && (sp.get("category") ?? "") === cat.value,
  }));

  const sections = [
    {
      title: "モデル",
      items: [
        { href: "/admin/models", label: "モデル一覧", match: (p: string) => p.startsWith("/admin/models") },
      ],
    },
    {
      title: "セット",
      items: [
        { href: "/admin/series", label: "セット一覧", match: (p: string) => p.startsWith("/admin/series") },
      ],
    },
    { title: "クラブ", items: specItems },
    {
      title: "シャフト",
      items: [
        { href: "/admin/shafts", label: "シャフト一覧", match: (p: string) => p.startsWith("/admin/shafts") },
      ],
    },
    {
      title: "グリップ",
      items: [
        { href: "/admin/grips", label: "グリップ一覧", match: (p: string) => p.startsWith("/admin/grips") },
      ],
    },
    {
      title: "その他",
      items: [
        { href: "/admin/knowledge", label: "ナレッジ", match: (p: string) => p.startsWith("/admin/knowledge") },
      ],
    },
  ];

  return (
    <aside className="w-[220px] shrink-0 bg-[#1a1a1a] text-white h-screen sticky top-0 overflow-y-auto">
      <div className="p-4">
        <Link href="/admin" className="text-sm font-bold text-[#7cb668]">
          Waggly Admin
        </Link>
      </div>
      <nav className="px-3 pb-4 space-y-4">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="text-[10px] uppercase text-[#888] px-2 mb-1">{section.title}</p>
            {section.items.map((item) => {
              const active = item.match(pathname, searchParams);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-2 py-1.5 rounded-md text-sm ${
                    active ? "bg-[#006728] text-white font-bold" : "text-[#ccc] hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}

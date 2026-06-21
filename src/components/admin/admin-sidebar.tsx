"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface NavGroup {
  label: string;
  items: { href: string; label: string; match: (p: string) => boolean }[];
}

const navGroups: NavGroup[] = [
  {
    label: "",
    items: [
      { href: "/admin", label: "ダッシュボード", match: (p) => p === "/admin" },
    ],
  },
  {
    label: "カタログ",
    items: [
      { href: "/admin/catalog", label: "モデル管理", match: (p) => p === "/admin/catalog" || p.startsWith("/admin/catalog/models") },
      { href: "/admin/catalog/shafts", label: "シャフト管理", match: (p) => p.startsWith("/admin/catalog/shafts") },
      { href: "/admin/catalog/grips", label: "グリップ管理", match: (p) => p.startsWith("/admin/catalog/grips") },
      { href: "/admin/catalog/makers", label: "メーカー管理", match: (p) => p.startsWith("/admin/catalog/makers") },
    ],
  },
  {
    label: "ユーザーデータ",
    items: [
      { href: "/admin/clubs", label: "登録クラブ", match: (p) => p.startsWith("/admin/clubs") },
      { href: "/admin/items", label: "登録アイテム", match: (p) => p.startsWith("/admin/items") },
    ],
  },
  {
    label: "コンテンツ",
    items: [
      { href: "/admin/announcements", label: "お知らせ", match: (p) => p.startsWith("/admin/announcements") },
      { href: "/admin/knowledge", label: "ナレッジベース", match: (p) => p.startsWith("/admin/knowledge") },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <aside className="w-[220px] shrink-0 bg-[#1a1a1a] text-white h-screen sticky top-0 overflow-y-auto">
      <div className="p-4">
        <Link href="/admin" className="text-sm font-bold text-[#7cb668]">
          Waggly Admin
        </Link>
      </div>
      <nav className="px-3 pb-4 space-y-3">
        {navGroups.map((group) => (
          <div key={group.label || "__top"}>
            {group.label && (
              <p className="px-2 pt-2 pb-1 text-[10px] uppercase tracking-wider text-[#777]">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const active = item.match(pathname);
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
      <div className="mt-auto border-t border-[#333] px-3 py-3">
        <button
          onClick={handleLogout}
          className="block w-full rounded-md px-2 py-1.5 text-left text-sm text-[#999] hover:text-white"
        >
          ログアウト
        </button>
      </div>
    </aside>
  );
}

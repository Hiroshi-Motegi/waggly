"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminSidebar() {
  const pathname = usePathname();

  const items = [
    { href: "/admin/catalog", label: "カタログ", match: (p: string) => p.startsWith("/admin/catalog") },
    { href: "/admin/knowledge", label: "ナレッジ", match: (p: string) => p.startsWith("/admin/knowledge") },
  ];

  return (
    <aside className="w-[220px] shrink-0 bg-[#1a1a1a] text-white h-screen sticky top-0 overflow-y-auto">
      <div className="p-4">
        <Link href="/admin" className="text-sm font-bold text-[#7cb668]">
          Waggly Admin
        </Link>
      </div>
      <nav className="px-3 pb-4">
        {items.map((item) => {
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
      </nav>
    </aside>
  );
}

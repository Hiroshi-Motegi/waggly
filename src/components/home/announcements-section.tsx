import Image from "next/image";
import Link from "next/link";
import type { Announcement } from "@/lib/announcements-types";
import { categoryLabel, categoryColor } from "@/lib/announcements-types";

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export function AnnouncementsSection({ items }: { items: Announcement[] }) {
  if (items.length === 0) return null;

  return (
    <div className="w-full">
      <div className="rounded-lg bg-white divide-y divide-[#dfdfdf]">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/announcements/${item.id}`}
            className="flex items-center gap-2.5 px-4 py-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold text-white px-1.5 py-0.5 rounded ${categoryColor[item.category]}`}>
                  {categoryLabel[item.category]}
                </span>
                <span className="text-xs text-[#8b8b8b]">{formatDate(item.published_at)}</span>
              </div>
              <p className="text-sm font-bold text-[#333] truncate mt-1">{item.title}</p>
            </div>
            <Image src="/icons/chevron-right.svg" alt="" width={6} height={10} className="opacity-40 shrink-0" style={{ width: "auto", height: "auto" }} />
          </Link>
        ))}
      </div>
    </div>
  );
}

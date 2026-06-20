import Link from "next/link";
import type { Announcement } from "@/lib/announcements";

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export function AnnouncementsSection({ items }: { items: Announcement[] }) {
  if (items.length === 0) return null;

  return (
    <div className="w-full">
      <div className="flex items-center px-1 mb-2">
        <h3 className="flex-1 text-lg font-bold text-white">お知らせ</h3>
      </div>
      <div className="rounded-lg bg-white divide-y divide-[#dfdfdf]">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/announcements/${item.id}`}
            className="flex flex-col gap-1 px-4 py-3"
          >
            <span className="text-xs text-[#8b8b8b]">{formatDate(item.published_at)}</span>
            <span className="text-sm font-bold text-[#333]">{item.title}</span>
            <span className="text-xs text-[#666] line-clamp-2">{item.body}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

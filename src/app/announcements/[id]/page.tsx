import { notFound } from "next/navigation";
import { fetchAnnouncement, categoryLabel, categoryColor } from "@/lib/announcements";
import { PublicPageLayout } from "@/components/layout/public-page-layout";

export default async function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await fetchAnnouncement(id);
  if (!item) notFound();

  const d = new Date(item.published_at);
  const dateStr = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;

  return (
    <PublicPageLayout title="お知らせ" backHref="/">
      <div className="px-2 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded border border-white">
            {categoryLabel[item.category]}
          </span>
        </div>
        <h1 className="text-lg font-bold text-white">{item.title}</h1>
        <p className="text-xs text-white mb-4">{dateStr}</p>
      </div>
      <div className="rounded-lg bg-white px-4 py-5">
        <div className="text-sm text-[#444] leading-relaxed whitespace-pre-wrap">
          {item.body}
        </div>
      </div>
    </PublicPageLayout>
  );
}

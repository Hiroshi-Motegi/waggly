import { notFound } from "next/navigation";
import { fetchAnnouncement } from "@/lib/announcements";
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
      <div className="rounded-lg bg-white px-4 py-5 space-y-3">
        <p className="text-xs text-[#8b8b8b]">{dateStr}</p>
        <h1 className="text-lg font-bold text-[#333]">{item.title}</h1>
        <div className="text-sm text-[#444] leading-relaxed whitespace-pre-wrap">
          {item.body}
        </div>
      </div>
    </PublicPageLayout>
  );
}

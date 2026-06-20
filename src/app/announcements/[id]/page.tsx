import { notFound } from "next/navigation";
import { fetchAnnouncement, categoryLabel } from "@/lib/announcements";
import { PublicPageLayout } from "@/components/layout/public-page-layout";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
      <div className="rounded-lg bg-white px-4 py-5 prose prose-sm max-w-none prose-headings:text-[#006728] prose-headings:border-l-4 prose-headings:border-[#006728] prose-headings:pl-2 prose-headings:text-base prose-p:text-[#444] prose-li:text-[#444] prose-strong:text-[#333] prose-strong:font-bold">
        <Markdown remarkPlugins={[remarkGfm]}>{item.body}</Markdown>
      </div>
      <div className="flex justify-center mt-4">
        <a href="/announcements" className="rounded-full border border-white px-6 py-1.5 text-sm font-bold text-white">お知らせ一覧へ</a>
      </div>
    </PublicPageLayout>
  );
}

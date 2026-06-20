import { fetchAnnouncements } from "@/lib/announcements";
import { PublicPageLayout } from "@/components/layout/public-page-layout";
import { AnnouncementsSection } from "@/components/home/announcements-section";

export const metadata = {
  title: "お知らせ | Waggly",
  description: "Wagglyからのお知らせ一覧です。",
};

export default async function AnnouncementsPage() {
  const items = await fetchAnnouncements(50);

  return (
    <PublicPageLayout title="お知らせ" backHref="/">
      {items.length > 0 ? (
        <AnnouncementsSection items={items} />
      ) : (
        <div className="rounded-lg bg-white px-4 py-8 text-center text-sm text-[#8b8b8b]">
          お知らせはありません。
        </div>
      )}
    </PublicPageLayout>
  );
}

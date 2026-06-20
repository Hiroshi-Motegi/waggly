export type AnnouncementCategory = "info" | "feature" | "maintenance" | "campaign";

export const categoryLabel: Record<AnnouncementCategory, string> = {
  info: "お知らせ",
  feature: "新機能",
  maintenance: "メンテナンス",
  campaign: "キャンペーン",
};

export const categoryColor: Record<AnnouncementCategory, string> = {
  info: "bg-gray-500",
  feature: "bg-green-600",
  maintenance: "bg-amber-500",
  campaign: "bg-rose-500",
};

export interface Announcement {
  id: string;
  title: string;
  body: string;
  published_at: string;
  category: AnnouncementCategory;
}

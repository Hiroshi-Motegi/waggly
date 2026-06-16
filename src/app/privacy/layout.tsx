import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description:
    "Waggly のプライバシーポリシーです。個人情報の取り扱い、外部サービスとのデータ共有について説明しています。",
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}

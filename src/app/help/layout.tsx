import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ご利用ガイド",
  description:
    "Waggly の使い方・アカウント連携・プラン・広告表示・ゴルファー名刺・退会についてのガイドです。",
};

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return children;
}

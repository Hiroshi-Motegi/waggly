import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "利用規約",
  description: "Waggly の利用規約です。サービスの利用条件、プラン、禁止事項などをご確認ください。",
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

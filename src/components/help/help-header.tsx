"use client";

import { PublicPageHeader } from "@/components/layout/public-page-header";

export function HelpHeader({ title }: { title: string }) {
  return <PublicPageHeader title={title} backHref="/help" />;
}

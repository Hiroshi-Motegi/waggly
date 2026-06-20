"use client";

import { PageHeader } from "@/components/layout/page-header";
import { termsSections, TERMS_LAST_UPDATED } from "@/lib/terms-content";

export default function TermsPage() {
  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      <div className="relative z-10 flex flex-col space-y-2">
        <PageHeader title="利用規約" variant="dark" />

        <div className="rounded-lg bg-white p-4 space-y-5 leading-relaxed">
          <p className="text-xs text-[#8b8b8b]">最終更新日: {TERMS_LAST_UPDATED}</p>

          {termsSections.map((section, i) => (
            <section key={i} className="space-y-1">
              <h3 className="text-base font-bold text-[#006728]">{section.title}</h3>
              {section.blocks.map((block, j) =>
                block.type === "text" ? (
                  <p key={j} className="text-base">{block.content}</p>
                ) : (
                  <ul key={j} className="list-disc pl-5 space-y-0.5 text-base">
                    {block.items.map((item, k) => (
                      <li key={k}>{item}</li>
                    ))}
                  </ul>
                )
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

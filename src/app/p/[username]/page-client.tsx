"use client";

import { useState, useEffect, use } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Loading } from "@/components/loading";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface PublicProfile {
  username: string;
  avatar_url: string | null;
  nickname?: string | null;
  bio?: string | null;
  golf_start_date?: string | null;
  average_score?: number | null;
  best_score?: number | null;
  home_course?: string | null;
  sns_links?: { instagram?: string; x?: string; custom_links?: { label: string; url: string }[] };
  clubs?: Array<{
    id: string;
    category: string;
    club_number: string;
    maker: string | null;
    model: string | null;
    club_images: Array<{ image_url: string; is_primary: boolean }>;
  }>;
  courses?: Array<{
    id: string;
    gora_course_id: number | null;
    course_name: string;
    course_image_url: string | null;
    evaluation: number | null;
    address: string | null;
  }>;
}

function AccordionSection({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className="rounded-lg bg-white overflow-hidden">
      <button onClick={() => setOpen(!open)} className="flex items-center w-full px-3 py-4">
        <h2 className="flex-1 text-sm font-bold text-[#006728] text-left">{title}</h2>
        {open ? <ChevronUp className="h-4 w-4 text-[#8b8b8b]" /> : <ChevronDown className="h-4 w-4 text-[#8b8b8b]" />}
      </button>
      {open && (
        <div className="px-3 pb-3">
          {children}
        </div>
      )}
    </div>
  );
}

const clubNoImage: Record<string, string> = {
  driver: "/no-images/driver.png",
  fairway_wood: "/no-images/fw.png",
  utility: "/no-images/ut.png",
  iron: "/no-images/Iron.png",
  wedge: "/no-images/wedge.png",
  putter: "/no-images/putter.png",
};

export default function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/p/${username}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch");
        setProfile(await res.json());
      } catch {
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [username]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-[#139847]">
        <img src="/images/home-bg.jpg" alt="" className="fixed inset-0 w-full h-full object-cover opacity-40 pointer-events-none" />
        <div className="relative z-10">
          <Loading variant="light" />
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-[#139847] text-white gap-4">
        <img src="/images/home-bg.jpg" alt="" className="fixed inset-0 w-full h-full object-cover opacity-40 pointer-events-none" />
        <div className="relative z-10 text-center">
          <h1 className="text-2xl font-bold">ページが見つかりません</h1>
          <p className="mt-2 text-white/70">このプロフィールは公開されていないか、存在しません。</p>
        </div>
      </div>
    );
  }

  const displayName = profile.nickname || profile.username;

  return (
    <div className="relative flex flex-col bg-[#139847]" style={{ minHeight: "100dvh" }}>
      <img src="/images/home-bg.jpg" alt="" className="fixed inset-0 w-full h-full object-cover opacity-40 pointer-events-none" />
      <div className="relative z-10 flex flex-col">
        {/* Header */}
        <div className="flex flex-col items-center gap-2 pt-10 pb-4 px-4">
          <Avatar className="h-20 w-20 ring-2 ring-white">
            <AvatarImage src={profile.avatar_url ?? undefined} />
            <AvatarFallback className="bg-white text-[#006728] text-2xl font-bold">
              {(displayName ?? "?")[0]}
            </AvatarFallback>
          </Avatar>
          <h1 className="text-xl font-bold text-white">{displayName}</h1>
          {profile.bio && <p className="text-sm text-white/80 text-center max-w-xs">{profile.bio}</p>}

          {/* SNS icons under bio */}
          {profile.sns_links && (profile.sns_links.instagram || profile.sns_links.x) && (
            <div className="flex gap-3 mt-1">
              {profile.sns_links.instagram && (
                <a href={profile.sns_links.instagram} target="_blank" rel="noopener" className="flex items-center justify-center size-9 rounded-full bg-white/20">
                  <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                </a>
              )}
              {profile.sns_links.x && (
                <a href={profile.sns_links.x} target="_blank" rel="noopener" className="flex items-center justify-center size-9 rounded-full bg-white/20">
                  <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 px-2 pb-8">
          {/* Golf info */}
          {(profile.golf_start_date != null || profile.average_score != null || profile.best_score != null || profile.home_course) && (
            <>
              <div className="rounded-lg bg-white overflow-hidden">
                <div className="grid grid-cols-3">
                  {profile.golf_start_date != null && (() => {
                    const start = new Date(profile.golf_start_date + "T00:00:00");
                    const now = new Date();
                    let years = now.getFullYear() - start.getFullYear();
                    let months = now.getMonth() - start.getMonth();
                    if (months < 0) { years--; months += 12; }
                    const label = years > 0 ? `${years}年${months > 0 ? `${months}ヶ月` : ""}` : `${months}ヶ月`;
                    return (
                      <div className="flex items-center p-3 border-b border-[#dfdfdf]">
                        <span className="flex-1 text-sm text-[#9c9c9c]">ゴルフ歴</span>
                        <span className="text-[#006728] font-bold text-base">{label}</span>
                      </div>
                    );
                  })()}
                  {profile.average_score != null && (
                    <div className="flex items-center p-3 border-b border-l border-[#dfdfdf]">
                      <span className="flex-1 text-sm text-[#9c9c9c]">平均スコア</span>
                      <span className="text-[#006728] font-bold text-base">{profile.average_score}</span>
                    </div>
                  )}
                  {profile.best_score != null && (
                    <div className="flex items-center p-3 border-b border-l border-[#dfdfdf]">
                      <span className="flex-1 text-sm text-[#9c9c9c]">ベストスコア</span>
                      <span className="text-[#006728] font-bold text-base">{profile.best_score}</span>
                    </div>
                  )}
                </div>
                {profile.home_course && (
                  <div className="flex items-center p-3">
                    <span className="shrink-0 text-sm text-[#9c9c9c] mr-3">ホームコース</span>
                    <span className="text-[#006728] font-bold text-base truncate">{profile.home_course}</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* その他のリンク (accordion) */}
          {profile.sns_links?.custom_links && profile.sns_links.custom_links.length > 0 && (
            <AccordionSection title="リンク" defaultOpen>
              <div className="flex flex-col">
                {profile.sns_links.custom_links.map((link, i) => (
                  <a key={i} href={link.url} target="_blank" rel="noopener" className={`flex items-center py-2.5 ${i < profile.sns_links!.custom_links!.length - 1 ? "border-b border-[#dfdfdf]" : ""}`}>
                    <span className="flex-1 text-base text-black truncate">{link.label}</span>
                    <svg width="6" height="10" viewBox="0 0 6 10" className="shrink-0 opacity-60 ml-2"><path d="M1 1l4 4-4 4" stroke="#8b8b8b" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </a>
                ))}
              </div>
            </AccordionSection>
          )}

          {/* マイバッグ (accordion) */}
          {profile.clubs && profile.clubs.length > 0 && (
            <AccordionSection title="マイバッグ">
              <div className="flex flex-col">
                {profile.clubs.map((club, i) => {
                  const img = club.club_images?.find((c) => c.is_primary) ?? club.club_images?.[0];
                  return (
                    <div key={club.id} className={`flex items-center gap-2.5 py-2 ${i < profile.clubs!.length - 1 ? "border-b border-[#dfdfdf]" : ""}`}>
                      <div className="size-[50px] shrink-0 overflow-hidden rounded bg-[#f0f0f0] flex items-center justify-center">
                        {img ? (
                          <img src={img.image_url} alt="" className="size-full object-cover" />
                        ) : (
                          <img src={clubNoImage[club.category] ?? "/no-images/etc.png"} alt="" className="size-full object-cover" />
                        )}
                      </div>
                      <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="shrink-0 bg-[#006728] text-white text-xs font-bold rounded-md px-2 py-0.5 min-w-[32px] text-center">{club.club_number}</span>
                          <span className="text-base font-bold text-black truncate">{club.model ?? "—"}</span>
                        </div>
                        <span className="text-sm text-[#8b8b8b] truncate pl-0.5">{club.maker ?? "—"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </AccordionSection>
          )}

          {/* お気に入りコース (accordion) */}
          {profile.courses && profile.courses.length > 0 && (
            <AccordionSection title="お気に入りコース">
              <div className="flex flex-col gap-2">
                {profile.courses.map((c) => {
                  const goraUrl = c.gora_course_id
                    ? `https://hb.afl.rakuten.co.jp/hgc/${process.env.NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID ?? ""}/gora/detail/id=${c.gora_course_id}/`
                    : null;
                  const inner = (
                    <div className="flex items-center gap-2">
                      {c.course_image_url && (
                        <img src={c.course_image_url} alt="" className="h-10 w-14 rounded object-cover shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{c.course_name}</p>
                        {c.address && <p className="text-xs text-[#8b8b8b] truncate">{c.address}</p>}
                      </div>
                      {c.evaluation != null && (
                        <span className="text-xs text-amber-500 shrink-0">★{c.evaluation.toFixed(1)}</span>
                      )}
                    </div>
                  );
                  return goraUrl ? (
                    <a key={c.id} href={goraUrl} target="_blank" rel="noopener">{inner}</a>
                  ) : (
                    <div key={c.id}>{inner}</div>
                  );
                })}
              </div>
            </AccordionSection>
          )}

          {/* Footer */}
          <div className="flex flex-col items-center gap-2 pt-4 pb-6">
            <p className="text-xs text-white/60">Wagglyで作成</p>
            <a href="https://waggly.jp" className="text-sm font-bold text-white underline">waggly.jp</a>
          </div>
        </div>
      </div>
    </div>
  );
}

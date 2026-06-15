"use client";

import { useState, useEffect, use, useRef } from "react";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Loading } from "@/components/loading";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toAffiliateUrl, getUrlPlatform } from "@/lib/affiliate";

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
  cover_images?: Array<{ id: string; image_url: string }>;
  clubs?: Array<{
    id: string;
    category: string;
    club_number: string;
    maker: string | null;
    model: string | null;
    bag_number: number;
    status: string;
    club_images: Array<{ image_url: string; is_primary: boolean }>;
  }>;
  items?: Array<{
    id: string;
    category: string;
    brand: string | null;
    model: string | null;
    purchase_url: string | null;
    accessory_images: Array<{ image_url: string; is_primary: boolean }>;
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

const categoryLabels: Record<string, string> = {
  ball: "ボール",
  glove: "グローブ",
  tee: "ティー",
  apparel: "アパレル",
  bag: "バッグ",
  rangefinder: "距離計",
  grip: "グリップ",
  shaft: "シャフト",
  other: "その他",
};

const categoryIcons: Record<string, string> = {
  ball: "/no-images/ball.png",
  glove: "/no-images/globe.png",
  tee: "/no-images/tee.png",
  apparel: "/no-images/ware.png",
  bag: "/no-images/bag.png",
  rangefinder: "/no-images/distance.png",
  grip: "/no-images/grip.png",
  shaft: "/no-images/shaft.png",
  other: "/no-images/etc.png",
};

const bagLabels: Record<string, string> = {
  main: "マイバッグ",
  sub: "予備バッグ",
  reserve: "保管庫",
};

function ClubsAccordion({ clubs }: { clubs: NonNullable<PublicProfile["clubs"]> }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);

  const mainBag = clubs.filter((c) => c.status === "bag" && c.bag_number === 1);
  const subBag = clubs.filter((c) => c.status === "bag" && c.bag_number === 2);
  const reserve = clubs.filter((c) => c.status === "reserve");

  const tabs: { key: string; clubs: typeof clubs }[] = [
    ...(mainBag.length > 0 ? [{ key: "main", clubs: mainBag }] : []),
    ...(subBag.length > 0 ? [{ key: "sub", clubs: subBag }] : []),
    ...(reserve.length > 0 ? [{ key: "reserve", clubs: reserve }] : []),
  ];

  const filtered = filter ? (tabs.find((t) => t.key === filter)?.clubs ?? []) : clubs;

  return (
    <div className="rounded-lg bg-white overflow-hidden">
      <button onClick={() => setOpen(!open)} className="flex items-center w-full px-3 py-4">
        <h2 className="flex-1 text-sm font-bold text-[#006728] text-left">クラブ</h2>
        {open ? <ChevronUp className="h-4 w-4 text-[#8b8b8b]" /> : <ChevronDown className="h-4 w-4 text-[#8b8b8b]" />}
      </button>
      {open && (
        <div className="px-3 pb-3">
          {tabs.length > 1 && (
            <div className="flex flex-wrap gap-1.5 pb-3">
              <button
                onClick={() => setFilter(null)}
                className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                  filter === null ? "bg-[#006728] text-white" : "bg-[#f0f0f0] text-[#8b8b8b]"
                }`}
              >
                すべて
              </button>
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                    filter === tab.key ? "bg-[#006728] text-white" : "bg-[#f0f0f0] text-[#8b8b8b]"
                  }`}
                >
                  {bagLabels[tab.key]}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-col">
            {filtered.map((club, i) => {
              const img = club.club_images?.find((c) => c.is_primary) ?? club.club_images?.[0];
              return (
                <div key={club.id} className={`flex items-center gap-2.5 py-2 ${i < filtered.length - 1 ? "border-b border-[#dfdfdf]" : ""}`}>
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
        </div>
      )}
    </div>
  );
}

function ItemsAccordion({ items, categories }: { items: PublicProfile["items"] & {}; categories: string[] }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);

  const filtered = filter ? items.filter((item) => item.category === filter) : items;

  return (
    <div className="rounded-lg bg-white overflow-hidden">
      <button onClick={() => setOpen(!open)} className="flex items-center w-full px-3 py-4">
        <h2 className="flex-1 text-sm font-bold text-[#006728] text-left">アイテム</h2>
        {open ? <ChevronUp className="h-4 w-4 text-[#8b8b8b]" /> : <ChevronDown className="h-4 w-4 text-[#8b8b8b]" />}
      </button>
      {open && (
        <div className="px-3 pb-3">
          {/* Category filter tabs */}
          {categories.length > 1 && (
            <div className="flex flex-wrap gap-1.5 pb-3">
              <button
                onClick={() => setFilter(null)}
                className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                  filter === null ? "bg-[#006728] text-white" : "bg-[#f0f0f0] text-[#8b8b8b]"
                }`}
              >
                すべて
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                    filter === cat ? "bg-[#006728] text-white" : "bg-[#f0f0f0] text-[#8b8b8b]"
                  }`}
                >
                  {categoryLabels[cat] ?? cat}
                </button>
              ))}
            </div>
          )}

          {/* Item list */}
          <div className="flex flex-col">
            {filtered.map((item, i) => {
              const img = item.accessory_images?.find((a) => a.is_primary) ?? item.accessory_images?.[0];
              const href = item.purchase_url ? toAffiliateUrl(item.purchase_url) : null;
              const Row = href ? "a" : "div";
              const linkProps = href ? { href, target: "_blank" as const, rel: "noopener noreferrer" } : {};
              return (
                <Row key={item.id} {...linkProps} className={`flex items-center gap-2.5 py-2 ${i < filtered.length - 1 ? "border-b border-[#dfdfdf]" : ""}`}>
                  <div className="size-[50px] shrink-0 overflow-hidden rounded bg-[#f0f0f0] flex items-center justify-center">
                    {img ? (
                      <img src={img.image_url} alt="" className="size-full object-cover" />
                    ) : (
                      <img src={categoryIcons[item.category] ?? "/no-images/etc.png"} alt="" className="size-full object-cover" />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                    <span className="text-xs font-medium text-[#8b8b8b]">
                      {categoryLabels[item.category] ?? item.category}
                    </span>
                    <span className="text-base font-bold text-black truncate">
                      {[item.brand, item.model].filter(Boolean).join(" ") || "—"}
                    </span>
                  </div>
                  {href && <ExternalLink className="h-4 w-4 shrink-0 text-[#8b8b8b]" />}
                </Row>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function CoverCarousel({ images }: { images: Array<{ id: string; image_url: string }> }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const index = Math.round(el.scrollLeft / el.clientWidth);
      setActiveIndex(index);
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {images.map((img) => (
          <div key={img.id} className="w-full shrink-0 snap-start">
            <div className="aspect-[2/1] w-full">
              <img src={img.image_url} alt="" className="h-full w-full object-cover" />
            </div>
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i === activeIndex ? "bg-white" : "bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const isPreview = new URLSearchParams(window.location.search).has("preview");
        const url = isPreview ? "/api/profile/preview" : `/api/p/${username}`;
        const fetchFn = isPreview
          ? import("@/lib/api-client").then((m) => m.apiFetch)
          : Promise.resolve(fetch);
        const doFetch = await fetchFn;
        const res = await doFetch(url);
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
      <div className="flex items-center justify-center min-h-dvh">
        <div className="relative z-10">
          <Loading variant="light" />
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh text-white gap-4">
        <div className="relative z-10 text-center">
          <h1 className="text-2xl font-bold">ページが見つかりません</h1>
          <p className="mt-2 text-white/70">このプロフィールは公開されていないか、存在しません。</p>
        </div>
      </div>
    );
  }

  const displayName = profile.nickname || profile.username;

  return (
    <div className="relative flex flex-col" style={{ minHeight: "100dvh" }}>
      <div className="relative z-10 flex flex-col">
        {/* Header */}
        {profile.cover_images && profile.cover_images.length > 0 ? (
          <>
            <CoverCarousel images={profile.cover_images} />
            <div className="flex flex-col items-center gap-2 -mt-10 pb-4 px-4">
              <Avatar className="h-20 w-20 ring-2 ring-white">
                <AvatarImage src={profile.avatar_url ?? undefined} />
                <AvatarFallback className="bg-white text-[#006728] text-2xl font-bold">
                  {(displayName ?? "?")[0]}
                </AvatarFallback>
              </Avatar>
              <h1 className="text-xl font-bold text-white">{displayName}</h1>
              {profile.bio && <p className="text-sm text-white/80 text-center max-w-xs">{profile.bio}</p>}

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
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 pt-10 pb-4 px-4">
            <Avatar className="h-20 w-20 ring-2 ring-white">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback className="bg-white text-[#006728] text-2xl font-bold">
                {(displayName ?? "?")[0]}
              </AvatarFallback>
            </Avatar>
            <h1 className="text-xl font-bold text-white">{displayName}</h1>
            {profile.bio && <p className="text-sm text-white/80 text-center max-w-xs">{profile.bio}</p>}

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
        )}

        <div className="flex flex-col gap-2 px-2 pb-8">
          {/* Golf info */}
          {(profile.golf_start_date != null || profile.average_score != null || profile.best_score != null || profile.home_course) && (() => {
              const stats = [
                profile.golf_start_date != null ? "golf" : null,
                profile.average_score != null ? "avg" : null,
                profile.best_score != null ? "best" : null,
              ].filter(Boolean);
              const colsClass = stats.length === 1 ? "grid-cols-1" : stats.length === 2 ? "grid-cols-2" : "grid-cols-3";
              return (
              <div className="rounded-lg bg-white overflow-hidden">
                <div className={`grid ${colsClass}`}>
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
              );
            })()}

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

          {/* クラブ (accordion with tabs) */}
          {profile.clubs && profile.clubs.length > 0 && (
            <ClubsAccordion clubs={profile.clubs} />
          )}

          {/* アイテム (accordion) */}
          {profile.items && profile.items.length > 0 && (() => {
            const allCategories = [...new Set(profile.items!.map((item) => item.category))];

            return (
              <ItemsAccordion items={profile.items!} categories={allCategories} />
            );
          })()}

          {/* お気に入りコース (accordion) */}
          {profile.courses && profile.courses.length > 0 && (
            <AccordionSection title="お気に入りコース">
              <div className="flex flex-col gap-2">
                {profile.courses.map((c) => {
                  const goraUrl = c.gora_course_id
                    ? `https://hb.afl.rakuten.co.jp/hgc/${process.env.NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID ?? ""}/?pc=${encodeURIComponent(`https://search.gora.golf.rakuten.co.jp/cal/disp/c_id/${c.gora_course_id}/`)}`
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

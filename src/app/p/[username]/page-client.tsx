"use client";

import { useState, useEffect, use } from "react";
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
  sns_links?: { instagram?: string; x?: string };
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
    course_name: string;
    course_image_url: string | null;
    evaluation: number | null;
    address: string | null;
  }>;
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
        <Loading />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-[#139847] text-white gap-4">
        <img src="/images/home-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none" />
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
      <img src="/images/home-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none" />
      <div className="relative z-10 flex flex-col">
        {/* Header */}
        <div className="flex flex-col items-center gap-2 pt-10 pb-6 px-4">
          <Avatar className="h-20 w-20 ring-2 ring-white">
            <AvatarImage src={profile.avatar_url ?? undefined} />
            <AvatarFallback className="bg-white text-[#006728] text-2xl font-bold">
              {(displayName ?? "?")[0]}
            </AvatarFallback>
          </Avatar>
          <h1 className="text-xl font-bold text-white">{displayName}</h1>
          {profile.bio && <p className="text-sm text-white/80 text-center max-w-xs">{profile.bio}</p>}
        </div>

        <div className="flex flex-col gap-2 px-2 pb-8">
          {/* Golf info */}
          {(profile.golf_start_date != null || profile.average_score != null || profile.best_score != null || profile.home_course) && (
            <div className="rounded-lg bg-white p-4">
              <h2 className="text-sm font-bold text-[#006728] mb-2">ゴルフ情報</h2>
              <div className="grid grid-cols-2 gap-3">
                {profile.golf_start_date != null && (() => {
                  const start = new Date(profile.golf_start_date + "T00:00:00");
                  const now = new Date();
                  const years = Math.floor((now.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
                  return (
                    <div>
                      <p className="text-xs text-[#8b8b8b]">ゴルフ歴</p>
                      <p className="text-base font-bold">{years}年</p>
                    </div>
                  );
                })()}
                {profile.average_score != null && (
                  <div>
                    <p className="text-xs text-[#8b8b8b]">平均スコア</p>
                    <p className="text-base font-bold">{profile.average_score}</p>
                  </div>
                )}
                {profile.best_score != null && (
                  <div>
                    <p className="text-xs text-[#8b8b8b]">ベストスコア</p>
                    <p className="text-base font-bold">{profile.best_score}</p>
                  </div>
                )}
                {profile.home_course && (
                  <div>
                    <p className="text-xs text-[#8b8b8b]">ホームコース</p>
                    <p className="text-base font-bold">{profile.home_course}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MY BAG */}
          {profile.clubs && profile.clubs.length > 0 && (
            <div className="rounded-lg bg-white p-4">
              <h2 className="text-sm font-bold text-[#006728] mb-2">MY BAG</h2>
              <div className="grid grid-cols-2 gap-3">
                {profile.clubs.map((club) => {
                  const img = club.club_images?.find((i) => i.is_primary) ?? club.club_images?.[0];
                  return (
                    <div key={club.id} className="flex flex-col gap-1">
                      <div className="h-[100px] w-full overflow-hidden rounded-md bg-[#f0f0f0] flex items-center justify-center">
                        {img ? (
                          <img src={img.image_url} alt="" className="size-full object-cover" />
                        ) : (
                          <img src={clubNoImage[club.category] ?? "/no-images/etc.png"} alt="" className="size-full object-cover" />
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="shrink-0 bg-[#005c24] text-white text-[10px] font-bold rounded-md px-1.5 py-0.5">{club.club_number}</span>
                        <span className="text-sm font-bold truncate">{club.model ?? "—"}</span>
                      </div>
                      <span className="text-xs text-[#8b8b8b]">{club.maker ?? ""}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Favorite courses */}
          {profile.courses && profile.courses.length > 0 && (
            <div className="rounded-lg bg-white p-4">
              <h2 className="text-sm font-bold text-[#006728] mb-2">お気に入りコース</h2>
              <div className="flex flex-col gap-2">
                {profile.courses.map((c) => (
                  <div key={c.id} className="flex items-center gap-2">
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
                ))}
              </div>
            </div>
          )}

          {/* SNS Links */}
          {profile.sns_links && Object.values(profile.sns_links).some(Boolean) && (
            <div className="rounded-lg bg-white p-4">
              <h2 className="text-sm font-bold text-[#006728] mb-2">SNS</h2>
              <div className="flex gap-3">
                {profile.sns_links.instagram && (
                  <a href={profile.sns_links.instagram} target="_blank" rel="noopener" className="rounded-full bg-[#f0f0f0] px-4 py-2 text-sm font-bold">Instagram</a>
                )}
                {profile.sns_links.x && (
                  <a href={profile.sns_links.x} target="_blank" rel="noopener" className="rounded-full bg-[#f0f0f0] px-4 py-2 text-sm font-bold">X</a>
                )}
              </div>
            </div>
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

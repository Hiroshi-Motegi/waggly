import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import ClientPage from "./page-client";

export function generateStaticParams() {
  return [{ username: "_" }];
}

async function getProfile(username: string) {
  if (username === "_") return null;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data } = await supabase
    .from("profiles")
    .select("username, nickname, avatar_url, bio, golf_start_date, average_score, best_score, home_course")
    .eq("username", username)
    .eq("is_public", true)
    .maybeSingle();
  return data;
}

function buildClubSummary(profile: { golf_start_date?: string | null; average_score?: number | null; best_score?: number | null; home_course?: string | null }) {
  const parts: string[] = [];
  if (profile.golf_start_date) {
    const years = new Date().getFullYear() - new Date(profile.golf_start_date).getFullYear();
    if (years > 0) parts.push(`ゴルフ歴${years}年`);
  }
  if (profile.average_score) parts.push(`平均スコア${profile.average_score}`);
  if (profile.best_score) parts.push(`ベスト${profile.best_score}`);
  if (profile.home_course) parts.push(profile.home_course);
  return parts.join("・");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfile(username);

  if (!profile) {
    return { title: "プロフィール" };
  }

  const displayName = profile.nickname || profile.username;
  const summary = buildClubSummary(profile);
  const description = summary
    ? `${displayName}のゴルフクラブセッティング・練習記録。${summary}。Waggly ゴルファー名刺。`
    : `${displayName}のゴルフクラブセッティング・練習記録。Waggly ゴルファー名刺。`;

  return {
    title: `${displayName}のクラブセッティング`,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title: `${displayName}のクラブセッティング | Waggly`,
      description,
      type: "profile",
      url: `https://waggly.jp/p/${username}`,
      ...(profile.avatar_url
        ? { images: [{ url: profile.avatar_url, width: 200, height: 200 }] }
        : {}),
    },
  };
}

export default function Page(props: { params: Promise<{ username: string }> }) {
  return <ClientPage params={props.params} />;
}

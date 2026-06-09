// src/app/api/bag/witb-image/route.tsx
import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";

async function getGrassBgBase64(): Promise<string> {
  const buf = await readFile(join(process.cwd(), "public/images/grass-bg.jpg"));
  return `data:image/jpeg;base64,${buf.toString("base64")}`;
}

const categoryLabels: Record<string, string> = {
  driver: "ドライバー",
  fairway_wood: "FW",
  utility: "UT",
  iron: "アイアン",
  wedge: "ウェッジ",
  putter: "パター",
};

const categoryOrder = ["driver", "fairway_wood", "utility", "iron", "wedge", "putter"];

export async function GET(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const bagNumber = Number(request.nextUrl.searchParams.get("bag") ?? "1");

  const { data: clubs } = await supabase
    .from("clubs")
    .select("club_number, maker, model, category, distance, shaft_name, shaft_flex")
    .eq("user_id", userId)
    .eq("status", "bag")
    .eq("bag_number", bagNumber)
    .order("sort_order", { ascending: true });

  if (!clubs || clubs.length === 0) {
    return new Response("No clubs found", { status: 404 });
  }

  const { data: user } = await supabase
    .from("users")
    .select("display_name")
    .eq("id", userId)
    .single();

  const displayName = user?.display_name ?? "Golfer";

  const grouped = categoryOrder
    .map((cat) => ({
      category: cat,
      label: categoryLabels[cat] ?? cat,
      clubs: clubs.filter((c: any) => c.category === cat),
    }))
    .filter((g) => g.clubs.length > 0);

  const grassBg = await getGrassBgBase64();

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "810px",
          display: "flex",
          flexDirection: "column",
          fontFamily: "sans-serif",
          color: "white",
          position: "relative",
        }}
      >
        {/* Grass background */}
        <img
          src={grassBg}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "1200px",
            height: "810px",
            objectFit: "cover",
            opacity: 0.5,
          }}
        />
        <div style={{ position: "absolute", top: 0, left: 0, width: "1200px", height: "810px", backgroundColor: "rgba(0,80,20,0.4)" }} />

        {/* Content */}
        <div style={{ display: "flex", flexDirection: "column", padding: "40px", flex: 1, position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "36px", fontWeight: "bold" }}>{displayName}&apos;s Bag</span>
              <span style={{ fontSize: "18px", opacity: 0.8 }}>{clubs.length} clubs</span>
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", flex: 1 }}>
            {grouped.map((group) => (
              <div
                key={group.category}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  backgroundColor: "rgba(255,255,255,0.12)",
                  borderRadius: "12px",
                  padding: "12px 16px",
                  minWidth: "170px",
                }}
              >
                <span style={{ fontSize: "12px", opacity: 0.7, marginBottom: "8px", textTransform: "uppercase" as const }}>
                  {group.label}
                </span>
                {group.clubs.map((club: any, i: number) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                      <span style={{ fontSize: "20px", fontWeight: "bold" }}>{club.club_number}</span>
                      {club.distance && (
                        <span style={{ fontSize: "14px", opacity: 0.7 }}>{club.distance}yd</span>
                      )}
                    </div>
                    <span style={{ fontSize: "14px", opacity: 0.9 }}>
                      {[club.maker, club.model].filter(Boolean).join(" ") || "—"}
                    </span>
                    {club.shaft_name && (
                      <span style={{ fontSize: "11px", opacity: 0.6 }}>
                        {[club.shaft_name, club.shaft_flex].filter(Boolean).join(" ")}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Footer: ball logo left, waggly text right */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 24px 20px", position: "relative" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`data:image/svg+xml,${encodeURIComponent('<svg viewBox="0 0 248.06 256" fill="none" xmlns="http://www.w3.org/2000/svg"><g><path d="M225.996 143C225.996 205.408 175.405 255.999 112.998 255.999C50.591 255.999 0 205.408 0 143C0 80.5934 50.591 30.0024 112.998 30.0024C175.405 30.0024 225.996 80.5934 225.996 143Z" fill="white"/><path d="M211.197 142.998C211.196 88.7661 167.228 44.8026 112.996 44.8026C58.7644 44.8038 14.8014 88.7669 14.8002 142.998C14.8002 197.231 58.7637 241.199 112.996 241.2V256L110.082 255.96C49.0227 254.413 0 204.43 0 142.998C0.00118 80.5929 50.5905 30.0036 112.996 30.0024C175.402 30.0024 225.996 80.5922 225.998 142.998L225.957 145.918C224.41 206.977 174.428 256 112.996 256V241.2C167.229 241.2 211.197 197.232 211.197 142.998Z" fill="white"/><path d="M85.69 110.045C85.69 117.844 79.365 124.168 71.565 124.168C63.765 124.168 57.44 117.844 57.44 110.045C57.44 102.242 63.765 95.918 71.565 95.918C79.365 95.918 85.69 102.242 85.69 110.045Z" fill="white"/><path d="M161.022 110.045C161.022 117.844 154.697 124.168 146.897 124.168C139.097 124.168 132.772 117.844 132.772 110.045C132.772 102.242 139.097 95.918 146.897 95.918C154.697 95.918 161.022 102.242 161.022 110.045Z" fill="white"/><path d="M198.902 139.795C198.902 143.536 195.872 146.567 192.13 146.567C188.389 146.567 185.356 143.536 185.356 139.795C185.356 136.053 188.389 133.02 192.13 133.02C195.872 133.02 198.902 136.053 198.902 139.795Z" fill="white"/><path d="M207.935 162.372C207.935 166.113 204.902 169.144 201.16 169.144C197.419 169.144 194.388 166.113 194.388 162.372C194.388 158.63 197.419 155.597 201.16 155.597C204.902 155.597 207.935 158.63 207.935 162.372Z" fill="white"/><path d="M180.841 166.889C180.841 170.628 177.808 173.661 174.067 173.661C170.328 173.661 167.294 170.628 167.294 166.889C167.294 163.148 170.328 160.115 174.067 160.115C177.808 160.115 180.841 163.148 180.841 166.889Z" fill="white"/><path d="M194.389 184.949C194.389 188.69 191.355 191.721 187.614 191.721C183.873 191.721 180.842 188.69 180.842 184.949C180.842 181.207 183.873 178.177 187.614 178.177C191.355 178.177 194.389 181.207 194.389 184.949Z" fill="white"/><path d="M167.295 189.465C167.295 193.204 164.262 196.238 160.52 196.238C156.781 196.238 153.748 193.204 153.748 189.465C153.748 185.724 156.781 182.691 160.52 182.691C164.262 182.691 167.295 185.724 167.295 189.465Z" fill="white"/><path d="M140.2 203.014C140.2 206.752 137.167 209.786 133.428 209.786C129.687 209.786 126.653 206.752 126.653 203.014C126.653 199.272 129.687 196.239 133.428 196.239C137.167 196.239 140.2 199.272 140.2 203.014Z" fill="white"/><path d="M180.841 207.527C180.841 211.268 177.808 214.301 174.067 214.301C170.328 214.301 167.294 211.268 167.294 207.527C167.294 203.785 170.328 200.754 174.067 200.754C177.808 200.754 180.841 203.785 180.841 207.527Z" fill="white"/><path d="M158.264 221.073C158.264 224.815 155.23 227.848 151.489 227.848C147.747 227.848 144.717 224.815 144.717 221.073C144.717 217.332 147.747 214.301 151.489 214.301C155.23 214.301 158.264 217.332 158.264 221.073Z" fill="white"/><path d="M131.17 225.59C131.17 229.329 128.137 232.363 124.395 232.363C120.656 232.363 117.623 229.329 117.623 225.59C117.623 221.849 120.656 218.816 124.395 218.816C128.137 218.816 131.17 221.849 131.17 225.59Z" fill="white"/><path d="M136.214 140.424C138.113 137.287 142.195 136.283 145.332 138.182C148.469 140.081 149.473 144.163 147.574 147.3L135.655 166.993C130.774 175.056 119.077 175.056 114.197 166.993L107.958 156.683L101.718 166.993C96.838 175.056 85.141 175.056 80.26 166.993L68.341 147.3C66.442 144.163 67.446 140.081 70.583 138.182C73.72 136.283 77.802 137.287 79.701 140.424L90.988 159.074L97.229 148.765L97.462 148.394C102.473 140.705 113.882 140.829 118.687 148.765L124.926 159.074L136.214 140.424Z" fill="white"/><path d="M240.898 0.021C244.553-0.267 247.75 2.462 248.039 6.117C248.328 9.773 245.598 12.972 241.943 13.26C222.098 14.827 211.529 24.884 205.887 36.813C200.026 49.205 199.427 63.899 200.78 73.596C201.287 77.228 198.753 80.583 195.122 81.09C191.49 81.596 188.136 79.063 187.629 75.431C186.031 63.979 186.611 46.507 193.882 31.135C201.372 15.301 215.887 1.995 240.898 0.021Z" fill="white"/><path d="M245.917 44.409V21.622C245.917 18.893 244.042 16.446 241.318 16.293C230.696 15.694 220.798 21.664 213.926 28.907C211.52 31.443 212.405 35.443 215.441 37.177L237.089 49.534C241.023 51.78 245.917 48.939 245.917 44.409Z" fill="#FFC107"/></g></svg>')}`} style={{ width: "60px", height: "62px" }} />
          <span style={{ fontSize: "32px", fontWeight: "bold", letterSpacing: "-0.5px" }}>waggly</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 810,
    }
  );
}

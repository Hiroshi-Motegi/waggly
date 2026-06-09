"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { nativeHref } from "@/lib/native-routes";
import { Badge } from "@/components/ui/badge";
import type { ClubWithImages } from "@/types/database";

const categoryLabels: Record<string, string> = {
  driver: "ドライバー",
  fairway_wood: "FW",
  utility: "UT",
  iron: "アイアン",
  wedge: "ウェッジ",
  putter: "パター",
};

interface ClubCardProps {
  club: ClubWithImages;
}

export function ClubCard({ club }: ClubCardProps) {
  const primaryImage = club.club_images?.find((img) => img.is_primary) ?? club.club_images?.[0];

  return (
    <Link href={nativeHref(`/bag/${club.id}`)}>
      <Card className="overflow-hidden">
        <CardContent className="flex items-center gap-3 p-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-muted text-base text-muted-foreground">
            {primaryImage ? (
              <img src={primaryImage.image_url} alt={club.club_number} className="h-full w-full rounded-md object-cover" />
            ) : (
              club.club_number
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{club.club_number}</span>
              <Badge variant="secondary" className="text-sm">
                {categoryLabels[club.category]}
              </Badge>
            </div>
            <p className="truncate text-base text-muted-foreground">
              {[club.maker, club.model].filter(Boolean).join(" ") || "未設定"}
            </p>
          </div>
          {club.distance && (
            <div className="text-right">
              <span className="text-lg font-bold">{club.distance}</span>
              <span className="text-sm text-muted-foreground">yd</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

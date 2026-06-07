import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PracticeSessionWithClubs } from "@/types/database";

interface SessionCardProps {
  session: PracticeSessionWithClubs;
}

export function SessionCard({ session }: SessionCardProps) {
  return (
    <Link href={`/practice/${session.id}`}>
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">{session.practiced_at}</p>
            <p className="text-sm text-muted-foreground">{session.location || "場所未入力"}</p>
          </div>
          {session.total_balls && (
            <Badge variant="secondary">{session.total_balls}球</Badge>
          )}
        </div>
        {session.practice_clubs?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {session.practice_clubs.map((pc) => (
              <Badge key={pc.id} variant="outline" className="text-xs">
                {pc.club?.club_number}: {pc.balls}球
              </Badge>
            ))}
          </div>
        )}
        {session.rating != null && (
          <div className="mt-2">
            <span className="text-amber-500 text-sm">{"★".repeat(session.rating)}{"☆".repeat(5 - session.rating)}</span>
          </div>
        )}
        {session.memo && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{session.memo}</p>
        )}
      </CardContent>
    </Card>
    </Link>
  );
}

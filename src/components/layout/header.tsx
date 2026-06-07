"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Header() {
  const { user } = useAuth();

  return (
    <header className="shrink-0 z-50 flex h-14 items-center justify-between border-b bg-background px-4">
      <h1 className="text-lg font-bold">Waggly</h1>
      {user && (
        <Link href="/settings">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar_url ?? undefined} />
            <AvatarFallback>{user.display_name[0]}</AvatarFallback>
          </Avatar>
        </Link>
      )}
    </header>
  );
}

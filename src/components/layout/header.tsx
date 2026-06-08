"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Header() {
  const { user } = useAuth();
  const pathname = usePathname();

  // Only show header on home page
  if (pathname !== "/") return null;

  return (
    <header className="shrink-0 z-50 flex h-14 items-center justify-center relative px-4">
      <Image src="/icons/waggly-logo.svg" alt="Waggly β" width={130} height={37} priority />
      {user && (
        <Link href="/settings" className="absolute right-4">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar_url ?? undefined} />
            <AvatarFallback>{user.display_name[0]}</AvatarFallback>
          </Avatar>
        </Link>
      )}
    </header>
  );
}

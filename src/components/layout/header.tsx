"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const backPatterns = [
  { match: /^\/bag\/[^/]+$/, href: "/bag" },
  { match: /^\/bag\/[^/]+\/edit$/, href: null },
  { match: /^\/bag\/[^/]+\/memos/, href: null },
  { match: /^\/bag\/[^/]+\/maintenances/, href: null },
  { match: /^\/items\/[^/]+$/, href: "/items" },
  { match: /^\/practice\/[^/]+$/, href: "/practice" },
  { match: /^\/practice\/[^/]+\/edit$/, href: null },
  { match: /^\/practice\/new$/, href: null },
  { match: /^\/coach\/plans\/[^/]+$/, href: "/coach/plans" },
  { match: /^\/courses\/[^/]+$/, href: "/courses" },
];

export function Header() {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const backTarget = backPatterns.find((p) => p.match.test(pathname));

  return (
    <header className="shrink-0 z-50 flex h-14 items-center justify-center relative px-4">
      {backTarget && (
        <button
          onClick={() => backTarget.href ? router.push(backTarget.href) : router.back()}
          className="absolute left-4 flex items-center justify-center"
        >
          <ChevronLeft className="h-6 w-6 text-black" />
        </button>
      )}
      <Image src="/icons/waggly-logo.svg" alt="Waggly" width={112} height={37} priority />
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

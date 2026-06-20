import Image from "next/image";
import Link from "next/link";

const links = [
  { href: "/", label: "ホーム" },
  { href: "/bag", label: "マイバッグ" },
  { href: "/items", label: "アイテム" },
  { href: "/practice", label: "練習記録" },
  { href: "/settings/share", label: "マイ名刺" },
  { href: "/coach", label: "AI相談" },
  { href: "/catalog", label: "クラブカタログ" },
  { href: "/help", label: "ヘルプ" },
];

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-16 text-center">
      <p className="text-[96px] font-thin leading-none text-white tracking-[0.15em] select-none">
        404
      </p>
      <Image src="/ball/ball-sad-w.png" alt="" width={64} height={64} className="mt-4 opacity-80" />
      <p className="text-2xl font-thin text-white mt-4 tracking-[0.2em]">Not Found</p>
      <p className="text-sm text-white mt-1">ページが見つかりません。</p>

      <div className="mt-10 w-full max-w-sm border-t border-white/15 pt-6">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-sm text-white/60 hover:text-white/90 transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

import Image from "next/image";
import Link from "next/link";

const links = [
  { href: "/", label: "ホーム", icon: "/icons/nav-home-w.svg" },
  { href: "/bag", label: "マイバッグ", icon: "/icons/nav-bag-w.svg" },
  { href: "/items", label: "アイテム", icon: "/icons/nav-items-w.svg" },
  { href: "/practice", label: "練習記録", icon: "/icons/nav-practice-w.svg" },
  { href: "/settings/share", label: "マイ名刺", icon: "/icons/nav-card-w.svg" },
  { href: "/coach", label: "AI相談", icon: "/icons/nav-ai-w.svg" },
  { href: "/catalog", label: "クラブカタログ", icon: "/icons/nav-catalog-w.svg" },
  { href: "/help", label: "ヘルプ", icon: "/icons/nav-help-w.svg" },
];

export default function NotFound() {
  return (
    <div className="flex flex-col items-center min-h-[60vh] px-4 pt-12 pb-16 text-center">
      <Image src="/images/witb-waggly-text.png" alt="Waggly" width={140} height={45} priority />

      <p className="text-[96px] font-thin leading-none text-white tracking-[0.15em] select-none mt-10">
        404
      </p>
      <Image src="/ball/ball-sad-w.png" alt="" width={64} height={64} className="mt-4" />
      <p className="text-2xl font-thin text-white mt-4 tracking-[0.2em]">Not Found</p>
      <p className="text-sm text-white mt-1">ページが見つかりません。</p>

      <div className="mt-12 w-full border-t border-white/15 pt-8 px-4">
        <p className="text-sm text-white text-center mb-8">以下のページからアクセスしてください</p>
        <div className="grid grid-cols-3 gap-y-6">
          {links.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1.5 text-white hover:text-white/70 transition-colors"
            >
              <Image src={icon} alt="" width={40} height={40} />
              <span className="text-sm">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

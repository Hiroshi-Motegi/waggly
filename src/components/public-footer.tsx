import Link from "next/link";

export function PublicFooter() {
  return (
    <footer className="w-full border-t border-white/15 bg-black/10 backdrop-blur-sm mt-auto">
      <div className="max-w-sm mx-auto px-4 py-6 space-y-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          <Link href="/terms" className="text-sm text-white/60 hover:text-white/90">利用規約</Link>
          <Link href="/privacy" className="text-sm text-white/60 hover:text-white/90">プライバシーポリシー</Link>
          <Link href="/legal" className="text-sm text-white/60 hover:text-white/90 whitespace-nowrap">特定商取引法に基づく表記</Link>
          <Link href="/help" className="text-sm text-white/60 hover:text-white/90">ご利用ガイド</Link>
        </div>
        <p className="text-xs text-white/30 text-center">&copy; cocoroe</p>
      </div>
    </footer>
  );
}

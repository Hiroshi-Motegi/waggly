import Image from "next/image";
import { LoginButtons } from "@/components/home/login-buttons";
import { PublicFooter } from "@/components/public-footer";

export const metadata = {
  title: "ログイン | Waggly",
};

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center" style={{ minHeight: "100dvh" }}>
      <div className="flex flex-col items-center justify-center flex-1 w-full max-w-sm px-8">
        <Image src="/images/witb-waggly-text.png" alt="Waggly" width={187} height={60} priority />
        <p className="mt-3 text-base text-white/80 text-center">ゴルフギアの管理をこれ一つで</p>

        <div className="w-full mt-12 bg-black/30 rounded-xl px-6 py-6">
          <p className="text-center text-base font-bold text-white mb-4">
            ログイン・新規登録<span className="inline-flex items-center bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full mx-1.5 -translate-y-px">無料</span>はこちらから
          </p>
          <LoginButtons />
        </div>

        <p className="mt-6 mb-12 text-xs text-white text-center">
          サインインすることで、利用規約とプライバシーポリシーに同意します
        </p>
      </div>

      <PublicFooter />
    </div>
  );
}

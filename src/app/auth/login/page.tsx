import Image from "next/image";
import { LoginButtons } from "@/components/home/login-buttons";

export const metadata = {
  title: "ログイン | Waggly",
};

export default function LoginPage() {
  return (
    <div className="relative flex flex-col items-center justify-center" style={{ minHeight: "100dvh" }}>
      <div className="flex flex-col items-center gap-6 w-full max-w-screen-sm px-6">
        <Image src="/icons/waggly-logo-white.svg" alt="Waggly" width={151} height={46} priority />
        <p className="text-white text-sm text-center">
          ログインしてすべての機能を利用しましょう
        </p>
        <LoginButtons />
      </div>
    </div>
  );
}

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Header } from "@/components/layout/header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Waggly - ゴルフクラブ管理",
  description: "自分のクラブセットを管理し、練習日記とAIで上達をサポート",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <AuthProvider>
          <div className="mx-auto max-w-md min-h-screen border-x border-border shadow-sm bg-background">
            <Header />
            <main className="min-h-[calc(100vh-7.5rem)]">{children}</main>
            <BottomNav />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}

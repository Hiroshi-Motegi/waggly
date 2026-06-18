import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { AppShell } from "@/components/app-shell";
import { SWRProvider } from "@/components/swr-provider";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Waggly - ゴルフクラブ管理・練習記録アプリ",
    template: "%s | Waggly",
  },
  description:
    "ゴルフクラブのセッティング管理、練習記録、AIコーチング。クラブスペック・メンテナンス履歴をまとめて管理し、ゴルファー名刺で仲間にシェア。",
  metadataBase: new URL("https://waggly.jp"),
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "Waggly",
    title: "Waggly - ゴルフクラブ管理・練習記録アプリ",
    description:
      "ゴルフクラブのセッティング管理、練習記録、AIコーチング。クラブスペック・メンテナンス履歴をまとめて管理し、ゴルファー名刺で仲間にシェア。",
  },
  twitter: {
    card: "summary_large_image",
  },
  alternates: {
    canonical: "https://waggly.jp",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head />
      <body className={`${inter.className} overscroll-none`}>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-MTSD5K9Q"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <SWRProvider>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </SWRProvider>
        <Script
          id="gtm"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-MTSD5K9Q');`,
          }}
        />
        <Script
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3196641615749613"
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}

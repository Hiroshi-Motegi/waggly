import Script from "next/script";

export default function PlanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Script src="https://js.pay.jp/v2/pay.js" strategy="beforeInteractive" />
      {children}
    </>
  );
}

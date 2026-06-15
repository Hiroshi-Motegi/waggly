import Script from "next/script";

export default function PlanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Script
        src="https://checkout.pay.jp/"
        strategy="lazyOnload"
        data-key={process.env.NEXT_PUBLIC_PAYJP_PUBLIC_KEY}
      />
      {children}
    </>
  );
}

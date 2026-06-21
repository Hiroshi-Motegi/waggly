const A8_MAT_TEXT = "4B5X8H+6G750Q+3OSK+BW8O2";
const TRACKING_PIXEL = `https://www13.a8.net/0.gif?a8mat=${A8_MAT_TEXT}`;

interface AlpenBuyLinkProps {
  alpenPid: string;
  label?: string;
}

function handleAffiliateClick(alpenPid: string) {
  import("@/lib/gtm").then(({ trackEvent }) =>
    trackEvent("affiliate_clicked", { pid: alpenPid, provider: "alpen" })
  );
}

export function AlpenBuyLink({ alpenPid, label = "アルペンで購入する" }: AlpenBuyLinkProps) {
  if (!alpenPid) return null;

  const alpenUrl = `https://store.alpen-group.jp/Form/Product/ProductDetail.aspx?shop=0&pid=${alpenPid}`;
  const a8Link = `https://px.a8.net/svt/ejp?a8mat=${A8_MAT_TEXT}&a8ejpredirect=${encodeURIComponent(alpenUrl)}`;

  return (
    <>
      <a
        href={a8Link}
        rel="nofollow"
        target="_blank"
        onClick={() => handleAffiliateClick(alpenPid)}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#006728] px-6 py-3 text-sm font-bold text-white hover:bg-[#005520] transition-colors w-full"
      >
        {label}
      </a>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={TRACKING_PIXEL} width={1} height={1} alt="" className="hidden" />
    </>
  );
}

const A8_MAT = "4B5X8H+6G750Q+3OSK+BW8O2";
const TRACKING_PIXEL = `https://www13.a8.net/0.gif?a8mat=${A8_MAT}`;

interface AlpenAdImageProps {
  alpenPid: string;
  alt: string;
  className?: string;
}

export function AlpenAdImage({ alpenPid, alt, className }: AlpenAdImageProps) {
  if (!alpenPid) return null;

  const alpenUrl = `https://store.alpen-group.jp/Form/Product/ProductDetail.aspx?shop=0&pid=${alpenPid}`;
  const imageUrl = `https://img.alpen-group.jp/Contents/ProductImages/0/${alpenPid}_L.jpg`;
  const a8Link = `https://px.a8.net/svt/ejp?a8mat=${A8_MAT}&a8ejpredirect=${encodeURIComponent(alpenUrl)}`;

  return (
    <a href={a8Link} rel="nofollow" target="_blank" className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt={alt} className="w-full h-full object-contain" loading="lazy" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={TRACKING_PIXEL} width={1} height={1} alt="" className="hidden" />
    </a>
  );
}

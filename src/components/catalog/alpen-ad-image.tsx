"use client";

import { useEffect, useRef } from "react";

interface AlpenAdImageProps {
  alpenPid: string;
  alt: string;
  className?: string;
}

declare global {
  interface Window {
    a8adscript?: (target: string) => {
      showAd: (config: Record<string, unknown>) => void;
    };
  }
}

export function AlpenAdImage({ alpenPid, alt, className }: AlpenAdImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !alpenPid) return;

    const productUrl = `https://store.alpen-group.jp/Form/Product/ProductDetail.aspx?shop=0&pid=${alpenPid}`;
    const imageUrl = `https://img.alpen-group.jp/Contents/ProductImages/0/${alpenPid}_L.jpg`;

    const tryShowAd = () => {
      if (window.a8adscript && containerRef.current) {
        const containerId = `alpen-ad-${alpenPid}`;
        containerRef.current.id = containerId;

        window.a8adscript("body").showAd({
          req: {
            mat: "4B5X8H+6G750Q+3OSK+BWGDT",
            alt: alt,
            id: containerId,
          },
          goods: {
            ejp: productUrl,
            imu: imageUrl,
          },
        });
      }
    };

    if (window.a8adscript) {
      tryShowAd();
    } else {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (window.a8adscript || attempts > 10) {
          clearInterval(interval);
          tryShowAd();
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, [alpenPid, alt]);

  if (!alpenPid) return null;

  return <div ref={containerRef} className={className} />;
}

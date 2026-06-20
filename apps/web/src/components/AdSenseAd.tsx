"use client";

import { useEffect, useRef } from "react";

type AdFormat = "auto" | "rectangle" | "vertical" | "horizontal";

interface AdSenseAdProps {
  adSlot: string;
  adFormat?: AdFormat;
  style?: React.CSSProperties;
  className?: string;
}

export default function AdSenseAd({
  adSlot,
  adFormat = "auto",
  style,
  className,
}: AdSenseAdProps) {
  const ref = useRef<HTMLModElement>(null);
  const pushedRef = useRef(false);

  useEffect(() => {
    if (pushedRef.current || !ref.current) return;

    const win = window as any;
    win.adsbygoogle = win.adsbygoogle || [];

    try {
      win.adsbygoogle.push({});
      pushedRef.current = true;
    } catch (err) {
      // AdSense가 아직 로드되지 않았거나 블록된 경우 무시
      console.warn("AdSense push skipped", err);
    }
  }, []);

  return (
    <ins
      ref={ref}
      className={`adsbygoogle ${className ?? ""}`}
      style={{
        display: "block",
        textAlign: "center",
        ...style,
      }}
      data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_CLIENT}
      data-ad-slot={adSlot}
      data-ad-format={adFormat}
      data-full-width-responsive="true"
    />
  );
}

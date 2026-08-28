"use client";

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

import { useEffect, useRef } from "react";

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

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

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushedRef.current = true;
    } catch (err) {
      // AdSense가 아직 로드되지 않았거나 블록된 경우 무시
      console.warn("AdSense push skipped", err);
    }
  }, []);

  if (!ADSENSE_CLIENT) return null;

  return (
    <ins
      ref={ref}
      className={`adsbygoogle ${className ?? ""}`}
      style={{
        display: "block",
        textAlign: "center",
        ...style,
      }}
      data-ad-client={ADSENSE_CLIENT}
      data-ad-slot={adSlot}
      data-ad-format={adFormat}
      data-full-width-responsive="true"
    />
  );
}

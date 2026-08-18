"use client";

import type { CSSProperties } from "react";

type Props = {
  src: string;
  alt: string;
  size: number;
  className?: string;
  style?: CSSProperties;
  priority?: boolean;
};

export function PlayerPhoto({ src, alt, className, style }: Props) {
  return (
    // Native img so the full PNG is shown as-is (no Next.js resize/compress).
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      draggable={false}
      className={className}
      style={style}
    />
  );
}

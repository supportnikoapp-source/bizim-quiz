"use client";

import type { ReactNode } from "react";

export function LandscapeFrame({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 bg-[#efeae3]">
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-8 text-center landscape:hidden">
        <p className="text-4xl">↻</p>
        <p className="font-serif text-[28px] text-[#1b2448]">Telefonu yan çevir</p>
        <p className="text-sm text-[#6b7280]">Yapboz üfüqi ekranda tam görünür</p>
      </div>
      <div className="hidden h-full w-full landscape:flex">{children}</div>
    </div>
  );
}

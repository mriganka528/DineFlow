"use client";

import { ReactLenis } from "lenis/react";
import type { ReactNode } from "react";

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  return (
    <ReactLenis
      root
      options={{
        lerp: 0.1,
        duration: .4,
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 2,
        autoResize: true,
      }}
    >
      {children}
    </ReactLenis>
  );
}

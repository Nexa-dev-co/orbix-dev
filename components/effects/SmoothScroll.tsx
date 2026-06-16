"use client";

import { ReactNode } from "react";
import { useLenis } from "@/lib/hooks/useLenis";

/**
 * Client boundary that owns the single Lenis instance for the whole app.
 * Rendered once in the root layout, wrapping all page content.
 */
export default function SmoothScroll({ children }: { children: ReactNode }) {
  useLenis();
  return <>{children}</>;
}

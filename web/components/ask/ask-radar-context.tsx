"use client";

import { createContext, useContext } from "react";
import type { SurfacedItem } from "@/lib/queries";

export type AskContext = {
  /** Open the panel. Pass an item to scope the conversation to it. */
  open: (item?: SurfacedItem) => void;
  close: () => void;
  isOpen: boolean;
};

const Ctx = createContext<AskContext | null>(null);

export const AskRadarCtx = Ctx;

/**
 * Returns null outside a provider rather than throwing, so a card rendered in
 * isolation (a test, a future detail page) still works and simply has no Ask.
 */
export function useAskRadar(): AskContext | null {
  return useContext(Ctx);
}

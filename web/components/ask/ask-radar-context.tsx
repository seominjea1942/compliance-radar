"use client";

import { createContext, useContext } from "react";
import type { Message } from "./AskRadarPanel";
import type { SurfacedItem } from "@/lib/queries";

/**
 * The conversation, not just the open/close. The dock renders inside the page
 * layout now rather than as a child of the provider, so it reads its state
 * from here instead of taking it as props.
 */
export type AskContext = {
  /** Open the panel. Pass an item to scope the conversation to it. */
  open: (item?: SurfacedItem) => void;
  close: () => void;
  isOpen: boolean;
  scopedTo: SurfacedItem | null;
  clearScope: () => void;
  messages: Message[];
  pending: boolean;
  send: (text: string) => void;
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

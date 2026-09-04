"use client";

import { useCallback, useMemo, useState } from "react";
import { RadarFace } from "@/components/ui/radar-face";
import { AskRadarCtx } from "./ask-radar-context";
import { AskRadarPanel } from "./AskRadarPanel";
import type { SurfacedItem } from "@/lib/queries";

/**
 * Owns the Ask panel for the page: the floating launcher, the panel itself,
 * and the context that lets any card open it scoped to its own item.
 */
export function AskRadarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [scopedTo, setScopedTo] = useState<SurfacedItem | null>(null);

  const open = useCallback((item?: SurfacedItem) => {
    setScopedTo(item ?? null);
    setIsOpen(true);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo(() => ({ open, close, isOpen }), [open, close, isOpen]);

  return (
    <AskRadarCtx.Provider value={value}>
      {children}

      {/*
        The design floats this in the frame's top-right. A fixed bottom-right
        launcher is used instead because the real page scrolls for pages, and a
        top-anchored control would scroll away from the reader.
      */}
      <button
        type="button"
        onClick={() => (isOpen ? close() : open())}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close ask the radar" : "Ask the radar"}
        className={[
          "fixed right-6 bottom-6 z-50 size-11 cursor-pointer items-center justify-center",
          "rounded-full border-[3px] border-paper bg-green shadow-[0_3px_10px_rgba(24,24,27,0.22)]",
          "transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          // The panel is a full-width sheet on small screens, so the launcher
          // would sit on top of its footer. It stays a toggle on desktop.
          isOpen ? "hidden sm:flex" : "flex",
        ].join(" ")}
      >
        <RadarFace className="size-full" />
      </button>

      {isOpen && <AskRadarPanel scopedTo={scopedTo} onClose={close} />}
    </AskRadarCtx.Provider>
  );
}

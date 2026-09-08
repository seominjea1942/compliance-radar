"use client";

import { AskRadarPanel } from "./AskRadarPanel";
import { useAskRadar } from "./ask-radar-context";

/**
 * The ask panel's slot in the page.
 *
 * It sits inside the page's layout, beside `main` and under the application
 * bar, rather than beside the whole page as it did when the provider owned
 * the row. That is what lets the bar run the full width of the window across
 * both columns instead of stopping at the panel's edge.
 *
 * Above md it is always there. Below md there is no room for a column, so it
 * is a sheet over the page, shown only while open.
 */
export function AskRadarDock() {
  const ask = useAskRadar();
  if (!ask) return null;

  return (
    <aside
      aria-label="Ask the radar"
      className={[
        "z-40 flex-none bg-paper",
        ask.isOpen
          ? "fixed inset-x-0 bottom-0 flex h-[min(640px,88vh)] border-t border-line-strong"
          : "hidden",
        "md:sticky md:inset-auto md:top-[var(--app-bar-h)] md:flex",
        "md:h-[calc(100vh-var(--app-bar-h))] md:w-[380px] md:border-t-0 md:border-l md:border-line",
      ].join(" ")}
    >
      <AskRadarPanel
        scopedTo={ask.scopedTo}
        messages={ask.messages}
        pending={ask.pending}
        onSend={ask.send}
        onClearScope={ask.clearScope}
        onClose={ask.close}
      />
    </aside>
  );
}

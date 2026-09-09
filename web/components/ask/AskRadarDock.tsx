"use client";

import { AskRadarPanel } from "./AskRadarPanel";
import { useAskRadar } from "./ask-radar-context";

/**
 * The ask panel, summoned by the launcher rather than docked.
 *
 * It takes no space in the page's layout at any width: closed it renders
 * nothing, open it is fixed over the page. That is the difference from the
 * docked column it replaced, which reserved 380px of the row whether or not
 * anyone had asked anything.
 *
 * Above md it is a box anchored above the launcher. Below md there is no room
 * beside the page, so it rises from the bottom edge as a sheet.
 *
 * Its frame is the same 2px rule the application bar draws, not a hairline:
 * the panel floats over content rather than sitting in the layout, so the
 * edge has to hold on its own against whatever is behind it.
 */
export function AskRadarDock() {
  const ask = useAskRadar();
  if (!ask || !ask.isOpen) return null;

  return (
    <aside
      aria-label="Ask the radar"
      className={[
        // Warm-toned, not black: a neutral shadow on a cream page reads as
        // grey haze. Slight enough that the 2px frame is still what defines
        // the edge; the shadow only says the panel is above the page.
        "fixed z-40 flex bg-paper shadow-[0_10px_28px_-6px_rgba(25,21,17,0.16)]",
        // Sheet from the bottom edge below md.
        "inset-x-0 bottom-0 h-[min(640px,88vh)] border-t-2 border-rule",
        /*
         * From md, a box sitting clear of the launcher: the button occupies
         * 24-88px from the bottom, so 112px leaves a 24px gap rather than
         * covering the control that opened it, which now stays on screen.
         */
        "md:inset-x-auto md:right-6 md:bottom-28 md:h-[min(540px,70vh)] md:w-[380px]",
        "md:rounded-panel md:border-2 md:border-rule",
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

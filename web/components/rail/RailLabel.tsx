import * as React from "react";

/**
 * A section name in the context column.
 *
 * Deliberately a label and not a headline: these sections sit beside the feed,
 * where a full sentence competes with the one thing on the page that is
 * supposed to be read as a sentence.
 *
 * It carries no bottom margin: the section that owns it sets the gap, so a
 * section with its own `gap-3` does not end up spacing the name twice.
 *
 * The rule under it is the heavy one, not a hairline. It is doing the job the
 * removed card frames used to do: with no box around a section, the only thing
 * saying where one ends and the next begins is the weight of the line above
 * its name.
 */
export function RailLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="border-b-2 border-rule pb-1.5 font-mono text-[11px] font-medium tracking-[0.16em] text-ink uppercase">
      {children}
    </h2>
  );
}

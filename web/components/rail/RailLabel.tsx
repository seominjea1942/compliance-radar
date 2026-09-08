import * as React from "react";

/**
 * A section name in the context rail.
 *
 * Deliberately a label and not a headline: these sections sit in a column
 * beside the feed, where a full sentence competes with the one thing on the
 * page that is supposed to be read as a sentence. Same treatment as the
 * table's own column headers, so the rail reads as one object.
 */
export function RailLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-mono text-[10px] font-medium tracking-[0.14em] text-monoink uppercase">
      {children}
    </h2>
  );
}

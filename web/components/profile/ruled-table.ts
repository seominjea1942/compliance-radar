/**
 * The profile's list format, as class strings.
 *
 * No frame and no fills. A boxed list with a tinted header is what made these
 * two sections read as a wireframe: the box drew a rectangle around content
 * that was already the same colour as the page, and the fill behind each chip
 * added a second one per brand.
 *
 * What is left is the language the rest of the app already speaks. A heavy
 * rule under the column names, a hairline under each row, a heavy rule closing
 * the block. The rules do the aligning, so the columns need no edges of their
 * own.
 *
 * Its own module, with no "use client", so both lists import the same strings
 * rather than keeping their own copy that drifts.
 */
export const ruled = {
  /**
   * Column names. Mono and small: they label the table, they are not in it.
   *
   * A hairline under them, not the heavy rule. The heavy one is reserved for
   * the block's own edges; using it here too gave the header the same weight
   * as the boundary of the whole section.
   */
  head:
    "flex items-baseline gap-4 border-b border-line pb-2.5 " +
    "font-mono text-[10px] font-medium tracking-[0.14em] text-monoink uppercase",
  /** One row. The last drops its hairline; the block's closing rule follows. */
  row:
    "group flex items-baseline gap-4 border-b border-line px-3 py-3.5 last:border-b-0 " +
    "-mx-3 transition-colors hover:bg-shell",
  /** Closes the block, and carries the count line under it. */
  foot:
    "flex flex-wrap items-center gap-x-5 gap-y-2 border-t-2 border-rule pt-3",
  /** The count beside the add control, in the same voice as the column names. */
  tally: "font-mono text-[11px] tracking-[0.12em] text-monoink uppercase",
  /**
   * Per-row edit. A plain link that appears with the row's hover, so a table
   * of nine items is nine lines rather than nine lines and nine buttons.
   * Focus brings it back for the keyboard, which hover alone would strand.
   */
  edit:
    "flex-none cursor-pointer text-left text-[12.5px] font-medium text-brand " +
    "opacity-0 transition-opacity group-hover:opacity-100 " +
    "focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
  /**
   * A value that is not a brand name but a statement about brands
   * ("house-made", "any brand"). Dashed, so it reads as a note rather than as
   * one more supplier in the list.
   */
  note:
    "inline-flex items-center border border-dashed border-line-strong px-2 py-0.5 " +
    "font-mono text-[10.5px] tracking-[0.1em] text-monoink uppercase",
} as const;

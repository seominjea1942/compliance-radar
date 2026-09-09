/**
 * The segmented control's parts, as class strings.
 *
 * Its own module, with no "use client", because both kinds of caller import
 * it: `FilterPills` is a client component, and the log's control is a server
 * one built from links, since its filters live in the URL so the server can
 * do the filtering and paging. A plain constant exported from a client module
 * comes back undefined across that boundary, which is exactly what happened
 * when this lived in filter-pills.tsx: the log's control rendered with no
 * classes at all while the overview's looked right.
 *
 * A row of boxes sharing one frame, not pills floating on a track. The knob
 * is the ink itself, so the selected item is the darkest thing in the row
 * rather than the lightest.
 */
export const segmented = {
  /*
   * One frame around the whole row, with the items dividing it. Never wraps:
   * a segmented control folded onto two lines stops being one control. It
   * scrolls instead, with no scrollbar, since an item clipped by the frame's
   * edge already says there is more.
   */
  track:
    "inline-flex flex-nowrap items-stretch overflow-x-auto rounded-[2px] border border-rule " +
    "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
  /*
   * The divider is the item's own left border, so it exists exactly once
   * between any two items and never doubles at the frame's edge.
   */
  item:
    "flex flex-none cursor-pointer items-center gap-2 border-l border-rule px-5 py-2.5 " +
    "text-[13.5px] font-medium first:border-l-0 " +
    "transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
  active: "bg-rule text-paper",
  idle: "bg-paper text-muted hover:bg-hover hover:text-ink",
  /* 65% paper on the ink fill is 7.0:1, so the count stays secondary and legible. */
  countActive: "text-paper/65",
  /* text-muted, not text-faint: #67676d is 4.4:1 on the idle fill. */
  countIdle: "text-muted",
} as const;

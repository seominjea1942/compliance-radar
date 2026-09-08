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
 * Light grey track, black knob. The knob used to be white on a grey track, which
 * made the selected item the lightest thing on the page; on a glass panel
 * over a moving canvas it stopped reading as pressed at all.
 */
export const segmented = {
  /*
   * Never wraps. Six labelled items need 609px, which no window under about
   * 1200 gives it, and a segmented control folded onto two lines stops being
   * one control. It scrolls instead, with no scrollbar: a horizontal bar
   * inside a pill reads as damage, and an item clipped by the pill's edge
   * already says there is more.
   */
  track:
    "flex flex-nowrap items-center gap-1 overflow-x-auto rounded-full border border-line bg-canvas p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
  item:
    "flex flex-none cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium " +
    "transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
  active: "bg-ink text-paper",
  idle: "text-muted hover:bg-hover hover:text-ink",
  /* 65% white on the ink knob is 7.0:1, so the count stays secondary and legible. */
  countActive: "text-paper/65",
  /* text-muted, not text-faint: #71717a is 4.4:1 on the track. */
  countIdle: "text-muted",
} as const;

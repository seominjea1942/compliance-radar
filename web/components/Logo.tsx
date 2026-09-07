/**
 * Product mark, placeholder.
 *
 * A lettered tile and the name, sized and spaced the way a real logo would
 * be, so the header's left column holds the right amount of room. Swap the
 * tile for the artwork when there is any; nothing else needs to move.
 */
export function Logo() {
  return (
    <span className="flex flex-none items-center gap-2.5 select-none">
      <span
        aria-hidden
        className="flex size-7 items-center justify-center rounded-[8px] bg-ink text-[13px] font-semibold text-paper"
      >
        R
      </span>
      <span className="hidden text-[14.5px] font-semibold tracking-[-0.01em] text-ink sm:inline">
        Compliance Radar
      </span>
    </span>
  );
}

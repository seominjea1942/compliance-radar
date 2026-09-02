import { Avatar } from "@/components/ui/avatar";
import { NavItem } from "@/components/ui/nav-item";
import type { StoreProfile } from "@/lib/queries";
import { count } from "@/lib/format";

/**
 * Left rail on desktop; a sticky top bar below `md`, where the nav scrolls
 * horizontally rather than disappearing. One component, no JS: the design's
 * mobile artboards do not exist, so this is the web version made responsive.
 */
export function Sidebar({
  profile,
  surfacedCount,
  filteredCount,
}: {
  profile: StoreProfile | null;
  surfacedCount: number;
  filteredCount: number;
}) {
  const storeName = profile?.storeName ?? "Store";

  return (
    <nav
      className={[
        "sticky top-0 z-10 flex flex-none bg-rail",
        // Mobile: full-width bar across the top.
        "w-full flex-row items-center gap-3 overflow-x-auto border-b border-line px-4 py-3",
        // Desktop: the design's fixed rail.
        "md:h-screen md:w-[214px] md:flex-col md:items-stretch md:gap-5",
        "md:self-start md:overflow-visible md:border-r md:border-b-0 md:px-3.5 md:py-4",
      ].join(" ")}
    >
      <div className="flex max-w-[180px] flex-none items-center gap-2.5 rounded-[9px] border border-line-card bg-paper px-[11px] py-2.5 md:max-w-none">
        <Avatar name={storeName} shape="square" />
        <div className="flex min-w-0 flex-col gap-px">
          <span className="truncate font-serif text-sm/tight font-semibold">{storeName}</span>
          {profile?.location && (
            <span className="truncate text-[11.5px] text-faint">{profile.location}</span>
          )}
        </div>
      </div>

      <div className="flex flex-none flex-row gap-1 md:flex-col md:gap-0.5">
        <NavItem href="/" label="Overview" meta={count(surfacedCount)} active />
        <NavItem href="/log" label="Log" meta={count(filteredCount)} />
        <NavItem href="/profile" label="Store profile" />
        <NavItem href="/ask" label="Ask the radar" meta={<span className="font-sans">⌘K</span>} />
        <NavItem href="/sources" label="Sources" />
        <NavItem href="/settings" label="Settings" />
      </div>

      {profile?.owner && (
        // The owner block is rail furniture; on the top bar it would push the
        // nav off-screen, so it is desktop-only.
        <div className="mt-auto hidden flex-col gap-3 border-t border-line pt-3.5 md:flex">
          <div className="flex items-center gap-2.5">
            <Avatar name={profile.owner} />
            <div className="flex min-w-0 flex-col gap-px">
              <span className="text-[12.5px] font-medium text-ink">{profile.owner}</span>
              <span className="text-[11px] text-faint">Owner</span>
            </div>
            <span className="ml-auto text-[11px] text-ghost">›</span>
          </div>
        </div>
      )}
    </nav>
  );
}

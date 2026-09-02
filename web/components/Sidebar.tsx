import { Avatar } from "@/components/ui/avatar";
import { NavItem } from "@/components/ui/nav-item";
import type { StoreProfile } from "@/lib/queries";
import { count } from "@/lib/format";

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
      data-rail
      // The design frames a fixed rail; the feed can run to tens of thousands
      // of pixels, so pin it rather than letting it stretch.
      className="sticky top-0 flex h-screen w-[214px] flex-none flex-col gap-5 self-start border-r border-line bg-rail px-3.5 py-4"
    >
      <div className="flex items-center gap-2.5 rounded-[9px] border border-line-card bg-paper px-[11px] py-2.5">
        <Avatar name={storeName} shape="square" />
        <div className="flex min-w-0 flex-col gap-px">
          <span className="truncate font-serif text-sm/tight font-semibold">{storeName}</span>
          {profile?.location && (
            <span className="text-[11.5px] text-faint">{profile.location}</span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-0.5">
        <NavItem href="/" label="Overview" meta={count(surfacedCount)} active />
        <NavItem href="/log" label="Log" meta={count(filteredCount)} />
        <NavItem href="/profile" label="Store profile" />
        <NavItem href="/ask" label="Ask the radar" meta={<span className="font-sans">⌘K</span>} />
        <NavItem href="/sources" label="Sources" />
        <NavItem href="/settings" label="Settings" />
      </div>

      {profile?.owner && (
        <div className="mt-auto flex flex-col gap-3 border-t border-line pt-3.5">
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

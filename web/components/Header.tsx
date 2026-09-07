import Link from "next/link";
import {
  MdInfoOutline,
  MdOutlineDashboard,
  MdOutlineListAlt,
  MdOutlineSettings,
} from "react-icons/md";
import { BusinessSwitcher } from "@/components/BusinessSwitcher";
import { Logo } from "@/components/Logo";
import { Tooltip } from "@/components/ui/tooltip";
import type { StoreProfile } from "@/lib/queries";
import { count } from "@/lib/format";
import { cn } from "@/lib/utils";

export type Section = "overview" | "log" | "profile" | "about";

/**
 * The application bar, replacing the left rail.
 *
 * Three columns: the mark, the sections, the two identities. The sections sit
 * in the middle because they are the only thing here anyone clicks often, and
 * the two flanking columns are equal-basis so they stay centred in the window
 * rather than drifting with the length of the store's name.
 */
export function Header({
  profile,
  surfacedCount,
  setAsideCount,
  current = "overview",
}: {
  profile: StoreProfile | null;
  surfacedCount: number;
  /** Rows in the log: everything the radar set aside. */
  setAsideCount: number;
  current?: Section;
}) {
  const storeName = profile?.storeName ?? "Store";

  const tabs = [
    {
      href: "/",
      label: "Overview",
      section: "overview" as const,
      meta: count(surfacedCount),
      icon: <MdOutlineDashboard className="size-[18px] flex-none" aria-hidden />,
    },
    {
      href: "/log",
      label: "Log",
      section: "log" as const,
      meta: count(setAsideCount),
      icon: <MdOutlineListAlt className="size-[18px] flex-none" aria-hidden />,
    },
    {
      href: "/profile",
      label: "Store profile",
      section: "profile" as const,
      meta: undefined,
      // Settings, not a storefront: the page is a set of switches about
      // what the shop does and does not do.
      icon: <MdOutlineSettings className="size-[18px] flex-none" aria-hidden />,
    },
  ];

  return (
    <header className="sticky top-0 z-20 flex-none border-b border-line bg-paper">
      {/*
        One row above md. Below it the three columns do not fit in 375px, so
        the bar wraps: mark and identities on the first row, sections on a
        second that scrolls sideways by itself. Laid out with order rather
        than a second copy of the identity block, so there is one of each.
      */}
      {/* Edge to edge: 32px at the sides from md, 16 top and bottom. No
          max-width, or the cap decides the inset rather than the padding.
          Back to 16 at the sides below md, where 32 each way is a sixth of a
          375px screen and pushes the third tab out of the scroll row. */}
      <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-3 px-4 py-4 md:flex-nowrap md:px-8">
        <div className="order-1 flex flex-1 items-center">
          <Link href="/" aria-label="Compliance Radar, home" className="no-underline">
            <Logo />
          </Link>
        </div>

        {/*
          The active marker sits under its own tab rather than on the
          header's bottom edge: with the bar inset 16px all round there are
          16px of padding between the two, and a marker stranded down there
          would read as belonging to the border, not to the tab.
        */}
        <nav
          aria-label="Sections"
          className="order-3 flex w-full items-center gap-0.5 overflow-x-auto md:order-2 md:w-auto md:overflow-visible"
        >
          {tabs.map((t) => {
            const active = t.section === current;
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-2 px-3 pt-1 pb-3 text-[13.5px] whitespace-nowrap no-underline transition-colors",
                  active ? "font-medium text-ink" : "font-normal text-muted hover:text-ink",
                )}
              >
                {t.icon}
                {t.label}
                {t.meta !== undefined && (
                  <span className="font-mono text-[11px] font-medium text-monoink">{t.meta}</span>
                )}
                {active && (
                  <span aria-hidden className="absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-ink" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="order-2 flex items-center justify-end gap-1.5 md:order-3 md:flex-1">
          <Tooltip content="About this project">
            <Link
              href="/about"
              aria-label="About this project"
              aria-current={current === "about" ? "page" : undefined}
              className={cn(
                "flex size-9 items-center justify-center rounded-full no-underline transition-colors",
                current === "about" ? "bg-hover text-ink" : "text-faint hover:bg-hover hover:text-ink",
              )}
            >
              <MdInfoOutline className="size-[18px]" aria-hidden />
            </Link>
          </Tooltip>

          <BusinessSwitcher storeName={storeName} location={profile?.location} compact />

        </div>
      </div>
    </header>
  );
}

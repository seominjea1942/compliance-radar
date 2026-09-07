import Link from "next/link";
import {
  MdInfoOutline,
  MdOutlineDashboard,
  MdOutlineListAlt,
  MdOutlineStorefront,
} from "react-icons/md";
import { Avatar } from "@/components/ui/avatar";
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
      icon: <MdOutlineStorefront className="size-[18px] flex-none" aria-hidden />,
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
      <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-stretch gap-x-3 px-4 md:h-14 md:flex-nowrap md:px-6">
        <div className="order-1 flex h-14 flex-1 items-center">
          <Link href="/" aria-label="Compliance Radar, home" className="no-underline">
            <Logo />
          </Link>
        </div>

        {/*
          Full-height items so the active marker can sit on the header's own
          bottom edge, continuous with the border it interrupts.
        */}
        <nav
          aria-label="Sections"
          className="order-3 flex w-full items-stretch gap-0.5 overflow-x-auto md:order-2 md:w-auto md:overflow-visible"
        >
          {tabs.map((t) => {
            const active = t.section === current;
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-2 px-3 text-[13.5px] whitespace-nowrap no-underline transition-colors",
                  active ? "font-medium text-ink" : "font-normal text-muted hover:text-ink",
                )}
              >
                {t.icon}
                {t.label}
                {t.meta !== undefined && (
                  <span className="font-mono text-[11px] font-medium text-monoink">{t.meta}</span>
                )}
                {active && (
                  <span aria-hidden className="absolute inset-x-2 bottom-0 h-0.5 bg-ink" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="order-2 flex h-14 items-center justify-end gap-1.5 md:order-3 md:h-auto md:flex-1">
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

          {profile?.owner && (
            // Identity, not a control: there is one account and no menu to
            // open, so it reads its name on hover and does nothing on click.
            <Tooltip content={`${profile.owner}, owner`}>
              <span tabIndex={0} className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar name={profile.owner} />
              </span>
            </Tooltip>
          )}
        </div>
      </div>
    </header>
  );
}

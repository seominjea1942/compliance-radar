import Image from "next/image";
import Link from "next/link";
import { MdInfoOutline } from "react-icons/md";
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

  /*
   * 3dicons.co, v1 collection by realvjy, CC0. Rendered art rather than
   * glyphs, so they are images at a fixed box instead of an icon font.
   *
   * The files carry no alpha: their background is opaque white, which is what
   * the header is, so they sit flush on it. That is a constraint on the bar,
   * not a detail. Anything behind a tab that is not white, a hover fill
   * included, would show as a square around the icon.
   *
   * `nudge` corrects the art inside the canvas, not the box. Each render is
   * centred differently in its own 200px frame: measuring the bounding box of
   * the non-white pixels puts the target's centre 10px below the middle where
   * the notebook and the toggle are within 1.5px of it. At a 40px box that is
   * two visible pixels, which is what made the first tab sit low.
   */
  const tabs = [
    {
      href: "/",
      label: "Overview",
      section: "overview" as const,
      meta: count(surfacedCount),
      icon: "/icons3d/overview.webp",
      nudge: "-translate-y-[2px]",
    },
    {
      href: "/log",
      label: "Log",
      section: "log" as const,
      meta: count(setAsideCount),
      icon: "/icons3d/log.webp",
      nudge: "",
    },
    {
      href: "/profile",
      label: "Store profile",
      section: "profile" as const,
      meta: undefined,
      icon: "/icons3d/profile.webp",
      nudge: "",
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
      {/* Edge to edge, inset 16px. No max-width: the bar spans the window,
          and a cap on it put the mark 28px from the edge at 1440 rather than
          the 16 it is padded by. */}
      <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-3 p-4 md:flex-nowrap">
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
                  "relative flex items-center gap-2 px-3 py-1 text-[13.5px] whitespace-nowrap no-underline transition-colors",
                  active ? "font-medium text-ink" : "font-normal text-muted hover:text-ink",
                )}
              >
                {/* Decorative: the label beside it is the accessible name. */}
                <Image
                  src={t.icon}
                  alt=""
                  width={48}
                  height={48}
                  aria-hidden
                  className={cn("size-10 flex-none", t.nudge)}
                />
                {t.label}
                {t.meta !== undefined && (
                  <span className="font-mono text-[11px] font-medium text-monoink">{t.meta}</span>
                )}
                {active && (
                  <span aria-hidden className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-ink" />
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

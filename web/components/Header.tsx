import Link from "next/link";
import {
  MdInfoOutline,
  MdOutlineDashboard,
  MdOutlineSettings,
} from "react-icons/md";
import { BusinessSwitcher } from "@/components/BusinessSwitcher";
import { Logo } from "@/components/Logo";
import { Tooltip } from "@/components/ui/tooltip";
import { getLastChecked, type StoreProfile } from "@/lib/queries";
import { checkedAt } from "@/lib/format";
import { cn } from "@/lib/utils";

/* "log" is gone: it was a route, and it is a view of the overview now. */
export type Section = "overview" | "profile" | "about";

/**
 * The application bar, replacing the left rail.
 *
 * Three columns: the mark, the sections, the two identities. The sections sit
 * in the middle because they are the only thing here anyone clicks often, and
 * the two flanking columns are equal-basis so they stay centred in the window
 * rather than drifting with the length of the store's name.
 */
export async function Header({
  profile,
  current = "overview",
}: {
  profile: StoreProfile | null;
  current?: Section;
}) {
  const storeName = profile?.storeName ?? "Store";
  /*
   * Fetched here rather than passed in. The stamp is true of the whole
   * application, not of one screen, and threading it through five pages to
   * reach a bar that renders on all five is work with no reader.
   */
  const checked = checkedAt(await getLastChecked());

  const tabs = [
    {
      href: "/",
      label: "Overview",
      section: "overview" as const,
      icon: <MdOutlineDashboard className="size-[18px] flex-none" aria-hidden />,
    },
    {
      href: "/profile",
      label: "Store profile",
      section: "profile" as const,
      // Settings, not a storefront: the page is a set of switches about
      // what the shop does and does not do.
      icon: <MdOutlineSettings className="size-[18px] flex-none" aria-hidden />,
    },
  ];

  return (
    <header className="sticky top-0 z-20 flex-none border-b-2 border-rule bg-paper md:h-[var(--app-bar-h)]">
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
      <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-3 px-4 py-4 md:h-full md:flex-nowrap md:px-8 md:py-0">
        <div className="order-1 flex flex-1 items-center">
          <Link href="/" aria-label="Shopbell, home" className="no-underline">
            <Logo />
          </Link>
        </div>

        {/*
          The active marker sits ON the header's rule, not above it: a heavy
          squared segment laid over the 2px line, so the line and the marker
          read as one object rather than two stacked ones. That only works
          where the nav is full height (md and up, where the bar has no
          vertical padding); below md the nav is its own wrapped row and the
          marker stays under its own tab.
        */}
        <nav
          aria-label="Sections"
          className="order-3 flex w-full items-center gap-0.5 overflow-x-auto md:order-2 md:h-full md:w-auto md:overflow-visible"
        >
          {tabs.map((t) => {
            const active = t.section === current;
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-2 px-3 pt-1 pb-3 text-[13.5px] whitespace-nowrap no-underline transition-colors md:h-full md:py-0",
                  active ? "font-medium text-ink" : "font-normal text-muted hover:text-ink",
                )}
              >
                {t.icon}
                {t.label}
                {active && (
                  <span aria-hidden className="absolute inset-x-[10px] bottom-0 h-[6px] bg-rule md:-bottom-0.5" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="order-2 flex items-center justify-end gap-2.5 md:order-3 md:flex-1">
          {/* Hidden below md, where the bar has three columns to fit in 375px
              and this is the only one that is not a control. */}
          {checked && (
            <span className="hidden font-mono text-[11px] tracking-[0.08em] whitespace-nowrap text-monoink uppercase lg:inline">
              {checked}
            </span>
          )}
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

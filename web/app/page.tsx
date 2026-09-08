import { AskRadarProvider } from "@/components/ask/AskRadarProvider";
import { AskRadarDock } from "@/components/ask/AskRadarDock";
import { Header } from "@/components/Header";
import { SurfacedFeed, defaultTier, tierCounts } from "@/components/SurfacedFeed";
import { ContextRail } from "@/components/rail/ContextRail";
import {
  getFilteredLog,
  getStoreProfile,
  getSurfaced,
  getWeeklySummary,
  groupSurfaced,
} from "@/lib/queries";
import type { DecisionTab } from "@/components/ui/decision-tabs";

// Live operational data: never serve a build-time snapshot.
export const dynamic = "force-dynamic";

const TIERS = ["act", "check", "file", "all"] as const;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const asked = Array.isArray(sp.tier) ? sp.tier[0] : sp.tier;

  const [summary, surfaced, profile, log] = await Promise.all([
    getWeeklySummary(),
    getSurfaced(),
    getStoreProfile(),
    // Only for the two counts the control shows on the set-aside half; one
    // row is enough, the totals come back with it either way.
    getFilteredLog({ status: "set-aside", limit: 1 }),
  ]);

  // One card per real-world recall event, grouped on the backend's event_key.
  const events = groupSurfaced(surfaced);

  /*
   * The tier lives in the URL now that the control spans both screens. Half
   * its items are server-filtered and paged, so a control that kept the other
   * half in component state would be two controls wearing one coat.
   */
  const tier = (TIERS.find((t) => t === asked) ?? defaultTier(events)) as DecisionTab;
  const counts = {
    ...tierCounts(events),
    "set-aside": log.overall.setAside,
    overturned: log.overall.overturned,
  };

  return (
    <AskRadarProvider>
      <div className="flex min-h-screen flex-col bg-shell">
        <Header
          profile={profile}
        />

        {/* The bar spans the window above this row; both side columns are
            columns of the row, so one header covers all three. */}
        <div className="flex min-h-0 flex-1">
          {/*
            Rail and feed share a row of their own, inside the row that holds
            the ask panel. Ordering them as siblings of the panel put it first
            at every width: it carries no order, so it sorted ahead of both.
          */}
          <div className="flex min-w-0 flex-1 flex-col xl:flex-row">
          <ContextRail />

          <main className="order-1 min-w-0 flex-1 bg-paper xl:order-2">
            {/*
              No card around the feed. The item cards are already cards, so the
              outer one framed a stack of frames and put two borders and two
              paddings between the page and every headline.
            */}
            <div className="mx-auto flex w-full max-w-[800px] flex-col gap-5 px-4 pt-5 pb-10 md:px-12 md:pt-7.5 md:pb-12">
                <SurfacedFeed
                  events={events}
                  reviewed={summary.reviewed}
                  filter={tier as "act" | "check" | "file" | "all"}
                  counts={counts}
                />
            </div>
          </main>
          </div>

          <AskRadarDock />
        </div>
      </div>
    </AskRadarProvider>
  );
}

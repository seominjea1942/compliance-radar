import { AskRadarProvider } from "@/components/ask/AskRadarProvider";
import { AskRadarDock } from "@/components/ask/AskRadarDock";
import { Header } from "@/components/Header";
import { SurfacedFeed } from "@/components/SurfacedFeed";
import { ContextRail } from "@/components/rail/ContextRail";
import {
  getLastChecked,
  getNearbyPermits,
  getStreetWork,
  getStoreProfile,
  getSurfaced,
  getWeeklySummary,
  getWeeklyTopics,
  groupSurfaced,
} from "@/lib/queries";
import { checkedAt } from "@/lib/format";

// Live operational data: never serve a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [summary, surfaced, permits, profile, topics, lastChecked, streetWork] =
    await Promise.all([
      getWeeklySummary(),
      getSurfaced(),
      getNearbyPermits(),
      getStoreProfile(),
      getWeeklyTopics(),
      getLastChecked(),
      getStreetWork(),
    ]);

  // One card per real-world recall event, grouped on the backend's event_key.
  const events = groupSurfaced(surfaced);

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
          {/*
            Context on the left, mirroring the ask panel on the right: a
            full-height column with a rule down its inside edge, rather than a
            card floating in the feed's own grid. It scrolls itself, so the
            weekly numbers and the map stay put while the feed runs past them.

            Only from xl. Two 380px columns leave a 264px feed at lg, which is
            narrower than the cards in it; below that the rail stacks after the
            feed, which is why the order is set rather than left to the DOM.
          */}
          <aside
            className={[
              "order-2 flex flex-col gap-5 px-4 pb-10 xl:order-1",
              "xl:sticky xl:top-[var(--app-bar-h)] xl:h-[calc(100vh-var(--app-bar-h))]",
              "xl:w-[380px] xl:flex-none xl:overflow-y-auto xl:border-r xl:border-line xl:px-6 xl:py-6 scroll-quiet",
            ].join(" ")}
          >
            <ContextRail
              checked={checkedAt(lastChecked)}
              topics={topics}
              permits={permits}
              streetWork={streetWork}
            />
          </aside>

          <main className="order-1 min-w-0 flex-1 bg-paper xl:order-2">
            {/*
              No card around the feed. The item cards are already cards, so the
              outer one framed a stack of frames and put two borders and two
              paddings between the page and every headline.
            */}
            <div className="mx-auto flex w-full max-w-[800px] flex-col gap-5 px-4 pt-5 pb-10 md:px-12 md:pt-7.5 md:pb-12">
              <SurfacedFeed events={events} reviewed={summary.reviewed} />
            </div>
          </main>
          </div>

          <AskRadarDock />
        </div>
      </div>
    </AskRadarProvider>
  );
}

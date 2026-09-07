import { AskRadarProvider } from "@/components/ask/AskRadarProvider";
import { PermitMap } from "@/components/PermitMap";
import { Header } from "@/components/Header";
import { SurfacedFeed } from "@/components/SurfacedFeed";
import { TopicTable } from "@/components/TopicTable";
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

        <main className="min-w-0 flex-1 bg-paper">
          {/*
            Feed on the left, context on the right. The rail is sticky so the
            weekly numbers and the map stay visible while the feed scrolls,
            which is the point of splitting them out of the column.
          */}
          <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-5 px-4 pt-5 pb-10 md:px-12 md:pt-7.5 md:pb-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-7">
            {/*
              No card around the feed. The item cards are already cards, so the
              outer one framed a stack of frames and put two borders and two
              paddings between the page and every headline. The column keeps
              the same gap, so nothing below it moves.
            */}
            <div className="flex flex-col gap-5">
              <SurfacedFeed events={events} reviewed={summary.reviewed} />
            </div>

            <aside className="flex flex-col gap-5 lg:sticky lg:top-6 lg:self-start">
              <TopicTable
                reviewed={summary.reviewed}
                filtered={summary.filtered}
                checked={checkedAt(lastChecked)}
                topics={topics}
              />
              {(permits.length > 0 || streetWork.length > 0) && (
                <PermitMap permits={permits} streetWork={streetWork} />
              )}
            </aside>
          </div>
        </main>
      </div>
    </AskRadarProvider>
  );
}

import { Card } from "@/components/ui/card";
import { AskRadarProvider } from "@/components/ask/AskRadarProvider";
import { PermitMap } from "@/components/PermitMap";
import { Sidebar } from "@/components/Sidebar";
import { SurfacedFeed } from "@/components/SurfacedFeed";
import { TopicTable } from "@/components/TopicTable";
import {
  getLastChecked,
  getNearbyPermits,
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
  const [summary, surfaced, permits, profile, topics, lastChecked] =
    await Promise.all([
      getWeeklySummary(),
      getSurfaced(),
      getNearbyPermits(),
      getStoreProfile(),
      getWeeklyTopics(),
      getLastChecked(),
    ]);

  // One card per real-world recall event, grouped on the backend's event_key.
  const events = groupSurfaced(surfaced);

  return (
    <AskRadarProvider>
      <div className="flex min-h-screen flex-col bg-shell md:flex-row">
        <Sidebar
          profile={profile}
          surfacedCount={summary.surfaced}
          filteredCount={summary.filtered}
        />

        <main className="min-w-0 flex-1 bg-paper">
          <div className="mx-auto flex w-full max-w-[800px] flex-col gap-5 px-4 pt-5 pb-10 md:gap-6.5 md:px-12 md:pt-7.5 md:pb-12">
            <Card className="gap-5">
              <SurfacedFeed events={events} reviewed={summary.reviewed} />
            </Card>

            <div className="flex flex-col gap-5 md:gap-6.5">
              <TopicTable
                reviewed={summary.reviewed}
                filtered={summary.filtered}
                checked={checkedAt(lastChecked)}
                topics={topics}
              />
              {permits.length > 0 && <PermitMap permits={permits} />}
            </div>
          </div>
        </main>
      </div>
    </AskRadarProvider>
  );
}

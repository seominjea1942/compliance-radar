import { Card } from "@/components/ui/card";
import { PermitMap } from "@/components/PermitMap";
import { Sidebar } from "@/components/Sidebar";
import { SurfacedCard } from "@/components/SurfacedCard";
import { TopicTable } from "@/components/TopicTable";
import { getNearbyPermits, getStoreProfile, getSurfaced, getWeeklySummary } from "@/lib/queries";
import { getLastChecked, getWeeklyTopics } from "@/lib/pending-views";
import { checkedAt, count } from "@/lib/format";

// Live operational data: never serve a build-time snapshot.
export const dynamic = "force-dynamic";

function Hero({ surfaced, reviewed }: { surfaced: number; reviewed: number }) {
  const quiet = surfaced === 0;
  return (
    <div className="flex flex-col gap-1.5">
      <h1 className="text-[20px]/tight font-semibold tracking-[-0.01em] text-ink md:text-[23px]">
        {quiet
          ? "Nothing needs you this week."
          : `${count(surfaced)} ${surfaced === 1 ? "thing needs" : "things need"} you.`}
      </h1>
      <p className="max-w-[700px] text-[14.5px]/relaxed text-pretty text-body md:text-[15.5px]">
        {quiet
          ? `I read ${count(reviewed)} items this week. None of them touch your store.`
          : `Out of ${count(reviewed)} items read this week. Everything else is in the log.`}
      </p>
    </div>
  );
}

export default async function HomePage() {
  const [summary, surfaced, permits, profile, topics, lastChecked] = await Promise.all([
    getWeeklySummary(),
    getSurfaced(),
    getNearbyPermits(),
    getStoreProfile(),
    getWeeklyTopics(),
    getLastChecked(),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-shell md:flex-row">
      <Sidebar
        profile={profile}
        surfacedCount={summary.surfaced}
        filteredCount={summary.filtered}
      />

      <main className="min-w-0 flex-1 bg-paper">
        <div className="mx-auto flex w-full max-w-[800px] flex-col gap-5 px-4 pt-5 pb-10 md:gap-6.5 md:px-12 md:pt-7.5 md:pb-12">
          <Card className="gap-5">
            <Hero surfaced={summary.surfaced} reviewed={summary.reviewed} />
            {surfaced.length > 0 && (
              <div className="flex flex-col gap-3.5">
                {surfaced.map((item) => (
                  <SurfacedCard key={item.decisionId} item={item} />
                ))}
              </div>
            )}
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
  );
}

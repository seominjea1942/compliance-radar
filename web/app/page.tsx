import { Card } from "@/components/ui/card";
import { PermitMap } from "@/components/PermitMap";
import { Sidebar } from "@/components/Sidebar";
import { SurfacedCard } from "@/components/SurfacedCard";
import { TopicTable } from "@/components/TopicTable";
import {
  getLastChecked,
  getNearbyPermits,
  getStoreProfile,
  getSurfaced,
  getWeeklySummary,
  getWeeklyTopics,
  type SurfacedItem,
} from "@/lib/queries";
import { checkedAt, count } from "@/lib/format";

// Live operational data: never serve a build-time snapshot.
export const dynamic = "force-dynamic";

/**
 * The headline counts what the store must ACT on, not everything surfaced.
 * Most surfaced rows are precautionary checks, and calling forty of those
 * "things that need you" is the alert fatigue the product exists to prevent.
 */
function Hero({ items, reviewed }: { items: SurfacedItem[]; reviewed: number }) {
  const act = items.filter((i) => i.severity === "act").length;
  const check = items.filter(
    (i) => i.severity === "priority-verify" || i.severity === "verify",
  ).length;
  const file = items.filter((i) => i.severity === "fyi").length;

  const rest = [
    check > 0 ? `${count(check)} to check` : null,
    file > 0 ? `${count(file)} for the file` : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-1.5">
      <h1 className="text-[20px]/tight font-semibold tracking-[-0.01em] text-ink md:text-[23px]">
        {act === 0
          ? "Nothing needs action this week."
          : `${count(act)} ${act === 1 ? "thing needs" : "things need"} action.`}
      </h1>
      <p className="max-w-[700px] text-[14.5px]/relaxed text-pretty text-body md:text-[15.5px]">
        {rest.length > 0 ? `${rest.join(", ")}. ` : ""}
        {count(reviewed)} items read this week; the rest is in the log.
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
            <Hero items={surfaced} reviewed={summary.reviewed} />
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

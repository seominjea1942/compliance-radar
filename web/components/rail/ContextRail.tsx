import { PermitMap } from "@/components/PermitMap";
import { TopicTable } from "@/components/TopicTable";
import { getNearbyPermits, getStreetWork, getWeeklyTopics } from "@/lib/queries";

/**
 * The context column: what was read this week, and what the street is doing.
 *
 * It owns its own column and its own queries. Three screens carry it now, and
 * passing four props plus four queries through each of them would have put
 * the rail's data requirements in the pages instead of in the rail.
 *
 * One component rather than two cards stacked by the page. They were never
 * two objects to the reader, and as cards each carried its own frame, fill
 * and headline into a column only 380px wide. They are labelled sections on
 * the page's own paper now, separated by a rule.
 */
export async function ContextRail({ className }: { className?: string } = {}) {
  const [topics, permits, streetWork] = await Promise.all([
    getWeeklyTopics(),
    getNearbyPermits(),
    getStreetWork(),
  ]);

  return (
    <aside
      className={
        /*
         * Placement belongs to the page, not to the rail: the overview sets
         * it beside the feed inside its own column, while the detail screens
         * still run it full height down the side. The default is that older
         * arrangement, so a page that says nothing keeps what it had.
         */
        className ??
        [
          "scroll-quiet order-2 flex flex-col gap-6 bg-paper px-4 pb-10 xl:order-1",
          "xl:sticky xl:top-[var(--app-bar-h)] xl:h-[calc(100vh-var(--app-bar-h))]",
          "xl:w-[380px] xl:flex-none xl:overflow-y-auto xl:border-r xl:border-line xl:px-6 xl:py-6",
        ].join(" ")
      }
    >
      <TopicTable topics={topics} />

      {(permits.length > 0 || streetWork.length > 0) && (
        <>
          <PermitMap permits={permits} streetWork={streetWork} />
        </>
      )}
    </aside>
  );
}

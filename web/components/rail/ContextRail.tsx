import { PermitMap } from "@/components/PermitMap";
import { TopicTable } from "@/components/TopicTable";
import type { Permit, StreetWork, TopicRow } from "@/lib/queries";

/**
 * The overview's context column: what was read this week, and what the street
 * is doing.
 *
 * One component rather than two cards stacked by the page. They were never
 * two objects to the reader, and as cards each carried its own frame, fill
 * and headline into a column only 380px wide. Now they are labelled sections
 * on the page's own paper, separated by a rule.
 */
export function ContextRail({
  checked,
  topics,
  permits,
  streetWork,
}: {
  checked: string | null;
  topics: TopicRow[];
  permits: Permit[];
  streetWork: StreetWork[];
}) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <TopicTable checked={checked} topics={topics} />

      {(permits.length > 0 || streetWork.length > 0) && (
        <>
          <hr className="m-0 border-0 border-t border-line" />
          <PermitMap permits={permits} streetWork={streetWork} />
        </>
      )}
    </div>
  );
}

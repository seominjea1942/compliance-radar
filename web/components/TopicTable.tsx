import Link from "next/link";
import { RailLabel } from "@/components/rail/RailLabel";
import type { TopicRow } from "@/lib/queries";
import { count } from "@/lib/format";

/** Column widths shared by the header and every row. */
const COL = { read: "w-10 text-right", forYou: "w-14 text-right" };

function Row({ topic }: { topic: TopicRow }) {
  // Nothing arrived on this topic this week. That is the product working, not
  // missing data, so it gets a stated quiet state rather than a blank cell.
  const quiet = topic.read === 0;

  return (
    <Link
      /*
       * Turns the topic filter on where you already are. It used to leave
       * for the log, which meant a row in the rail could only ever show you
       * half of its own number: the set-aside half.
       */
      href={`/?view=all&tag=${topic.id}`}
      // The row reads as "Food recalls 6 1" to a screen reader, which says
      // nothing about what pressing it does; the action is named instead.
      aria-label={`Filter to ${topic.label}`}
      className="flex items-baseline gap-3 bg-paper px-4 py-3 no-underline transition-colors hover:bg-hover focus-visible:relative focus-visible:z-[1] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span className={`flex-1 text-[15px] ${quiet ? "text-faint" : "text-ink"}`}>
        {topic.label}
      </span>
      {quiet ? (
        <span className="text-[12px] whitespace-nowrap text-faint italic">Quiet this week</span>
      ) : (
        <>
          <span className={`${COL.read} text-[15px] text-faint`}>{count(topic.read)}</span>
          <span className={`${COL.forYou} text-[15px] font-medium text-ink`}>
            {topic.forYou === 0 ? "–" : count(topic.forYou)}
          </span>
        </>
      )}
    </Link>
  );
}

/**
 * What the radar read this week, by topic.
 *
 * The heading used to be the sentence "170 items read this week. Set aside
 * 167", with an arrow to the log beside it. Both are gone: the sentence is
 * the table's own first column said twice, and a section in a rail wants a
 * name, not a claim. The rows still link to the log, each to its own topic,
 * which is what the arrow was doing in a less specific way.
 */
export function TopicTable({
  checked,
  topics,
}: {
  checked: string | null;
  topics: TopicRow[];
}) {
  return (
    <section className="flex w-full min-w-0 flex-col gap-3">
      <RailLabel>This week</RailLabel>
      {checked && <span className="-mt-1 text-[12.5px] text-faint">{checked}</span>}

      <div className="flex flex-col gap-px overflow-hidden rounded-lg border border-line bg-line">
        <div className="flex items-baseline gap-4 bg-rail px-4 py-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-monoink">
          <span className="flex-1">Topic</span>
          <span className={COL.read}>Read</span>
          <span className={COL.forYou}>For you</span>
        </div>
        {topics.map((t) => (
          <Row key={t.id} topic={t} />
        ))}
      </div>
    </section>
  );
}

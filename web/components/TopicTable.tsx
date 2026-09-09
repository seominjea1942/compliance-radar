import Link from "next/link";
import type { TopicRow } from "@/lib/queries";
import { count } from "@/lib/format";
import { RailLabel } from "@/components/rail/RailLabel";

/**
 * What the radar read, by topic, as a ledger rather than a table.
 *
 * No section label above it. "This week" named a window the page's own date
 * range no longer agrees with, and a made-up name for the block ("topic
 * tape") tells the reader nothing the rows do not. The rows are legible on
 * their own, so they are left to be.
 *
 * A rule under each row rather than a leader across it. The leader ran
 * through the middle of every line and, at five rows, read as damage rather
 * than as a guide; the eye only has to cross a 300px column, which a divider
 * under the row supports without drawing anything through it.
 */

/** Columns shared by every row, so the numbers line up down the block. */
const COL = { read: "w-9 text-right", forYou: "w-6 text-right" };

function Row({ topic }: { topic: TopicRow }) {
  // Nothing arrived on this topic. That is the product working, not missing
  // data, so it gets a stated quiet state rather than a blank cell.
  const quiet = topic.read === 0;

  return (
    <Link
      /*
       * Turns the topic filter on where you already are. It used to leave for
       * the log, which meant a row here could only ever show you half of its
       * own number: the set-aside half.
       */
      href={`/?view=all&tag=${topic.id}`}
      // The row reads as "Food recalls 156 6" to a screen reader, which says
      // nothing about what pressing it does; the action is named instead.
      aria-label={`Filter to ${topic.label}`}
      className="group flex items-baseline gap-3 border-b border-line py-[7px] no-underline transition-colors last:border-b-0 hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span
        className={`flex-1 font-mono text-[11.5px] tracking-[0.08em] uppercase transition-colors ${
          quiet ? "text-faint" : "text-ink group-hover:text-brand"
        }`}
      >
        {topic.label}
      </span>
      {quiet ? (
        <span className="flex-none font-mono text-[11.5px] whitespace-nowrap text-faint">0</span>
      ) : (
        <>
          <span className={`${COL.read} flex-none font-mono text-[12.5px] tabular-nums text-faint`}>
            {count(topic.read)}
          </span>
          <span
            className={`${COL.forYou} flex-none font-mono text-[12.5px] font-medium tabular-nums ${
              topic.forYou === 0 ? "text-ghost" : "text-alert"
            }`}
          >
            {topic.forYou === 0 ? "–" : count(topic.forYou)}
          </span>
        </>
      )}
    </Link>
  );
}

export function TopicTable({ topics }: { topics: TopicRow[] }) {
  /*
   * The one number the block is actually for: how much of everything it read
   * was worth putting in front of the owner. Summed here rather than queried,
   * because it has to equal the column above it or the block argues with
   * itself.
   */
  const flagged = topics.reduce((n, t) => n + t.forYou, 0);
  const read = topics.reduce((n, t) => n + t.read, 0);

  return (
    <section className="flex w-full min-w-0 flex-col gap-2.5">
      <RailLabel>By topic</RailLabel>

      <div className="flex flex-col">
        {topics.map((t) => (
          <Row key={t.id} topic={t} />
        ))}
      </div>

      <div className="flex items-baseline gap-3 border-t border-rule pt-2">
        <span className="flex-1 font-mono text-[11.5px] tracking-[0.08em] text-ink uppercase">
          Total flagged
        </span>
        <span className={`${COL.read} flex-none font-mono text-[12.5px] tabular-nums text-faint`}>
          {count(read)}
        </span>
        <span
          className={`${COL.forYou} flex-none font-mono text-[12.5px] font-semibold tabular-nums text-alert`}
        >
          {count(flagged)}
        </span>
      </div>
    </section>
  );
}

import { Card, CardNote, CardTitle } from "@/components/ui/card";
import type { TopicRow } from "@/lib/queries";
import { count } from "@/lib/format";

/** Column widths shared by the header and every row. */
const COL = { read: "w-10 text-right", forYou: "w-14 text-right" };

function Row({ topic }: { topic: TopicRow }) {
  // Nothing arrived on this topic this week. That is the product working, not
  // missing data, so it gets a stated quiet state rather than a blank cell.
  const quiet = topic.read === 0;

  return (
    <div className="flex items-baseline gap-3 bg-paper px-4 py-3">
      <span className={`flex-1 font-serif text-[15px] ${quiet ? "text-faint" : "text-ink"}`}>
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
    </div>
  );
}

export function TopicTable({
  reviewed,
  filtered,
  checked,
  topics,
}: {
  reviewed: number;
  filtered: number;
  checked: string | null;
  topics: TopicRow[];
}) {
  return (
    <Card className="w-full min-w-0 gap-4">
      <div className="flex items-baseline justify-between gap-4">
        <CardTitle>
          {count(reviewed)} items read this week. Filtered {count(filtered)}.
        </CardTitle>
        <a
          href="/log"
          className="whitespace-nowrap text-[13px] font-medium text-green no-underline hover:underline"
        >
          Open the log →
        </a>
      </div>

      {checked && (
        <div className="-mb-2 flex">
          <span className="inline-flex items-center gap-1.5 text-sm text-faint">
            {checked}
            <span className="size-1.5 rounded-full bg-green-soft" />
          </span>
        </div>
      )}

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

      <CardNote>Every one of them has a reason you can read, and overturn.</CardNote>
    </Card>
  );
}

import { Card, CardNote, CardTitle } from "@/components/ui/card";
import type { TopicRow } from "@/lib/queries";
import { count } from "@/lib/format";

/** Column widths are shared by the header and every row. */
const COL = { read: "w-16 text-right", forYou: "w-24 text-right" };

function Row({ topic }: { topic: TopicRow }) {
  return (
    <div className="flex items-baseline gap-4 bg-paper px-4 py-3">
      <span className="flex-1 font-serif text-base text-ink">{topic.label}</span>
      <span className={`${COL.read} text-[15px] text-faint`}>
        {topic.read === 0 ? "—" : count(topic.read)}
      </span>
      <span className={`${COL.forYou} text-[15px] font-medium text-ink`}>
        {topic.forYou === 0 ? "—" : count(topic.forYou)}
      </span>
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
    <Card className="min-w-0 flex-[1_1_340px] gap-4.5">
      <div className="flex items-baseline justify-between gap-4">
        <CardTitle>
          {count(reviewed)} items read in 90 days. Filtered {count(filtered)}.
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

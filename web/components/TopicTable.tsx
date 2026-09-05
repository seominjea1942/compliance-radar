import { MdArrowForward } from "react-icons/md";
import { Card, CardNote, CardTitle } from "@/components/ui/card";
import { Tooltip } from "@/components/ui/tooltip";
import type { TopicRow } from "@/lib/queries";
import { count } from "@/lib/format";

/** Column widths shared by the header and every row. */
const COL = { read: "w-16 text-right", forYou: "w-24 text-right" };

function Row({ topic }: { topic: TopicRow }) {
  // Nothing arrived on this topic this week. That is the product working, not
  // missing data, so it gets a stated quiet state rather than a blank cell.
  const quiet = topic.read === 0;

  return (
    <div className="flex items-baseline gap-4 bg-paper px-4 py-3">
      <span className={`flex-1 font-serif text-base ${quiet ? "text-faint" : "text-ink"}`}>
        {topic.label}
      </span>
      {quiet ? (
        <span className="text-[12.5px] text-faint italic">Watched, quiet this week</span>
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
    <Card className="w-full min-w-0 gap-4.5">
      <div className="flex items-start justify-between gap-4">
        <CardTitle>
          {count(reviewed)} items read this week. Filtered {count(filtered)}.
        </CardTitle>
        {/*
          Icon only, so the title keeps the full width of the card. The label
          it replaces still has to reach anyone not looking at the picture:
          aria-label names the link, and the tooltip opens on focus as well as
          hover, so the wording is available from the keyboard too.
        */}
        <Tooltip content="Open the log">
          <a
            href="/log"
            aria-label="Open the log"
            className="flex size-8 flex-none items-center justify-center rounded-control text-green transition-colors hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <MdArrowForward className="size-[18px]" aria-hidden />
          </a>
        </Tooltip>
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

"use client";

import Link from "next/link";
import { useState } from "react";
import { MdCheck, MdOutlineNotificationsActive } from "react-icons/md";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OverturnDialog } from "./OverturnDialog";
import type { LogRow } from "@/lib/queries";

/**
 * Log rows lead with the reason, not the title.
 *
 * The reason is the product here: the owner is auditing judgment calls, so the
 * sentence explaining the call outranks the source document's headline.
 */
export function LogRows({ rows }: { rows: LogRow[] }) {
  const [overturning, setOverturning] = useState<LogRow | null>(null);

  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-[14px] text-faint">
        Nothing here with these filters.
      </p>
    );
  }

  return (
    <>
      <ul className="m-0 flex list-none flex-col gap-px overflow-hidden rounded-lg border border-line bg-line p-0">
        {rows.map((row) => (
          <li key={row.decisionId} className="flex flex-col gap-2.5 bg-paper px-4 py-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{row.sourceLabel}</Badge>
              {row.overturned && (
                <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-green">
                  <MdCheck className="size-3.5" aria-hidden />
                  Overturned
                </span>
              )}
            </div>

            <Link
              href={`/item/${row.decisionId}`}
              className="m-0 text-pretty text-[14.5px]/relaxed text-ink no-underline hover:underline"
            >
              {row.shortReason}
            </Link>

            <p className="m-0 text-pretty text-[12px] text-faint">
              {row.title} · {row.postedLabel}
            </p>

            {!row.overturned && (
              <div className="flex">
                <Button
                  variant="cardAction"
                  size="action"
                  onClick={() => setOverturning(row)}
                >
                  <MdOutlineNotificationsActive className="size-[15px]" aria-hidden />
                  Should have shown me
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {overturning && (
        <OverturnDialog row={overturning} onClose={() => setOverturning(null)} />
      )}
    </>
  );
}

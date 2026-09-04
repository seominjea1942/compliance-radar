"use client";

import { useState } from "react";
import { MdCheck, MdOutlineNotificationsActive } from "react-icons/md";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ItemCard } from "@/components/ui/item-card";
import { OverturnDialog } from "./OverturnDialog";
import type { LogRow } from "@/lib/queries";

/**
 * Log entries use the same card shell as the overview feed, so the two screens
 * read as one product.
 *
 * The body order differs on purpose: the overview leads with the product,
 * because the question there is "what do I do about this". The log leads with
 * the reason, because the question there is "was that call right", and the
 * reason is the thing being audited.
 */
export function LogRows({ rows }: { rows: LogRow[] }) {
  const [overturning, setOverturning] = useState<LogRow | null>(null);

  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-[14px] text-faint">Nothing here with these filters.</p>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3.5">
        {rows.map((row) => (
          <ItemCard key={row.decisionId} dimmed={row.overturned} interactive>
            <ItemCard.Chips>
              <Badge>{row.sourceLabel}</Badge>
              {row.overturned && (
                <Badge variant="outline" className="gap-1.5 border-green-tint-line text-green">
                  <MdCheck className="size-3.5" aria-hidden />
                  Overturned
                </Badge>
              )}
            </ItemCard.Chips>

            <ItemCard.Body>
              <p className="m-0 max-w-[740px] font-serif text-[17px]/normal text-body md:text-[19px]">
                <ItemCard.Link
                  href={`/item/${row.decisionId}`}
                  className="text-body hover:underline"
                >
                  {row.shortReason}
                </ItemCard.Link>
              </p>
              <span className="max-w-[740px] text-pretty text-[12.5px] text-faint">
                {row.title}
              </span>
              <div className="text-[12.5px] text-faint">{row.postedLabel}</div>
            </ItemCard.Body>

            <ItemCard.Actions>
              {!row.overturned && (
                <Button variant="cardAction" size="action" onClick={() => setOverturning(row)}>
                  <MdOutlineNotificationsActive className="size-[15px]" aria-hidden />
                  Should have shown me
                </Button>
              )}
              <Button
                variant="cardAction"
                size="action"
                className="ml-auto text-[15px] text-ghost"
              >
                ···
              </Button>
            </ItemCard.Actions>
          </ItemCard>
        ))}
      </div>

      {overturning && (
        <OverturnDialog row={overturning} onClose={() => setOverturning(null)} />
      )}
    </>
  );
}

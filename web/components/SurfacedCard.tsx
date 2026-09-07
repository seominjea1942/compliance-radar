"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  MdBlock,
  MdCheck,
  MdInfoOutline,
  MdOutlineChatBubbleOutline,
  MdOutlineMailOutline,
  MdOutlineNotificationsOff,
  MdOutlineWarningAmber,
} from "react-icons/md";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ItemCard } from "@/components/ui/item-card";
import { Tooltip } from "@/components/ui/tooltip";
import { useAskRadar } from "@/components/ask/ask-radar-context";
import { cardCode } from "@/lib/format";
import type { SurfacedEvent } from "@/lib/queries";
import { resolveItems } from "@/app/actions";
import { ResolveDialog } from "@/components/ResolveDialog";
import { MdExpandLess, MdExpandMore } from "react-icons/md";

/**
 * The FDA's own recall severity scale, spelled out for anyone who doesn't read
 * enforcement reports for a living. The chip shows the FDA's term because that
 * is what the source document and any inspector will say; the tooltip carries
 * the plain-English meaning.
 */
/** What the row asks of the owner. Empty for plain verify: that is the norm. */
const ACTION_LABEL: Record<string, string> = {
  act: "Action needed",
  "priority-verify": "Check soon",
  fyi: "For the file",
};

const CLASS_MEANING: Record<string, string> = {
  "Class I": "The FDA's most serious tier: a reasonable probability of serious harm or death.",
  "Class II": "Temporary or medically reversible harm, with only a remote chance of serious harm.",
  "Class III": "Unlikely to cause harm. Usually a labelling or packaging defect.",
};

function UrgentBanner({ reason }: { reason: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-alert-line bg-alert-bg px-3.5 py-2.5">
      <MdOutlineWarningAmber className="mt-px size-4 flex-none text-alert" aria-hidden />
      <span className="text-[13.5px]/relaxed text-alert-ink">{reason}</span>
    </div>
  );
}

export function SurfacedCard({ event }: { event: SurfacedEvent }) {
  const item = event.lead;
  /**
   * "Done" is view-only. The data contract allows exactly two writes from the
   * UI (overturns and profile facts), and acknowledging an alert is neither,
   * so this collapses the card for the session and nothing else.
   */
  const [done, setDone] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [pending, startTransition] = useTransition();
  const ask = useAskRadar();

  /*
   * A grouped card resolves through the modal, because there is a choice to
   * make per product. A single-item card has no such choice, so Resolve writes
   * `handled` straight away and "Don't carry" writes the other outcome.
   */
  function resolveOne(resolution: "handled" | "not_carried") {
    startTransition(async () => {
      const res = await resolveItems([{ decisionId: item.decisionId, resolution }]);
      if (res.ok) setDone(true);
    });
  }
  // The banner is for "the store is affected", not "a serious recall exists":
  // a Class I recall of something you don't stock is not an emergency.
  const needsAction = item.severity === "act";

  return (
    <ItemCard
      dimmed={done}
      interactive
      // A group has no page of its own, so the whole card toggles its product
      // list instead. The expander button stays the keyboard control.
      onCardClick={event.isGroup ? () => setExpanded((v) => !v) : undefined}
    >
      <ItemCard.Chips>
        <Badge>{item.sourceLabel}</Badge>
        {ACTION_LABEL[item.severity] && (
          <Badge variant={needsAction ? "outlineAlert" : "outline"}>
            {ACTION_LABEL[item.severity]}
          </Badge>
        )}
        {item.classification && (
          <Tooltip
            content={
              <>
                <span className="font-medium">FDA {item.classification}</span>
                <br />
                {CLASS_MEANING[item.classification] ?? "FDA recall classification."}
              </>
            }
          >
            {/* tabIndex so the tooltip is reachable by keyboard, not hover only */}
            <Badge
              variant={needsAction ? "outlineAlert" : "outline"}
              tabIndex={0}
              className="relative z-[1] cursor-help gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {item.classification}
              <MdInfoOutline className="size-3.5 opacity-70" aria-hidden />
            </Badge>
          </Tooltip>
        )}
      </ItemCard.Chips>

      {needsAction && <UrgentBanner reason={item.shortReason} />}

      <ItemCard.Body>
        {event.isGroup ? (
          /* Headline carries firm, count and hazard, so the card states what
             the event is even when the urgent banner is showing above it. */
          <h3 className="max-w-[740px] font-serif text-[20px]/tight font-medium text-ink md:text-[25px]">
            {event.firm ?? item.sourceLabel}: {event.items.length} products
            {event.hazard ? `, ${event.hazard}` : ""}
          </h3>
        ) : (
          <h3 className="max-w-[740px] font-serif text-[20px]/tight font-medium md:text-[25px]">
            <ItemCard.Link href={`/item/${item.decisionId}`} className="text-ink">
              {item.displayTitle}
            </ItemCard.Link>
          </h3>
        )}

        {/* Brand and size only carry meaning next to an extracted name. */}
        {!event.isGroup && item.product?.productName && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-faint">
            {item.product.brand && <span>{item.product.brand}</span>}
            {item.product.sizes.length > 0 && (
              <>
                {item.product.brand && <span aria-hidden>·</span>}
                <span>{item.product.sizes.join(" · ")}</span>
              </>
            )}
            {cardCode(item.product.codeInfo) && (
              <>
                <span aria-hidden>·</span>
                <span className="font-mono">{cardCode(item.product.codeInfo)}</span>
              </>
            )}
          </div>
        )}
        <div className="text-[12.5px] text-faint">
          {item.timingLabel ?? item.postedLabel}
          {/*
            Older items are no longer hidden from the action tabs, so the card
            has to say how long one has been waiting. The timing line above
            reports the event's own date (when the recall was issued), which
            says nothing about how long it has sat unresolved.
          */}
          {item.agedLabel && (
            <>
              {" · "}
              <span className="text-monoink">{item.agedLabel}</span>
            </>
          )}
          {event.resolvedCount > 0 && (
            <>
              {" · "}
              <span className="text-green">
                {event.items.length} remaining of {event.allItems.length}
              </span>
            </>
          )}
        </div>
        {!needsAction && (
          <p className="max-w-[740px] font-serif text-[17px]/normal text-body md:text-[19px]">
            {item.shortReason}
          </p>
        )}

        {event.isGroup && (
          <div className="relative z-[1] flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="flex cursor-pointer items-center gap-1 self-start text-[12.5px] font-medium text-green hover:underline"
            >
              {expanded ? "Hide the products" : `Show all ${event.items.length} products`}
              {expanded ? (
                <MdExpandLess className="size-4" aria-hidden />
              ) : (
                <MdExpandMore className="size-4" aria-hidden />
              )}
            </button>

            {expanded && (
              <ul className="m-0 flex list-none flex-col gap-px overflow-hidden rounded-lg border border-line bg-line p-0">
                {event.items.map((member) => (
                  <li key={member.decisionId} className="flex flex-col gap-0.5 bg-paper px-3.5 py-2.5">
                    <Link
                      href={`/item/${member.decisionId}`}
                      className="text-[13px]/snug text-ink no-underline hover:underline"
                    >
                      {member.displayTitle}
                    </Link>
                    {member.product &&
                      (member.product.sizes.length > 0 || cardCode(member.product.codeInfo)) && (
                        <span className="text-[11.5px] text-faint">
                          {member.product.sizes.join(" · ")}
                          {member.product.sizes.length > 0 && cardCode(member.product.codeInfo)
                            ? " · "
                            : ""}
                          {cardCode(member.product.codeInfo) && (
                            <span className="font-mono">{cardCode(member.product.codeInfo)}</span>
                          )}
                        </span>
                      )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </ItemCard.Body>

      <ItemCard.Actions>
        <Button
          variant="cardAction"
          size="action"
          disabled={done || pending}
          onClick={() => (event.isGroup ? setResolving(true) : resolveOne("handled"))}
        >
          <MdCheck className="size-[15px]" aria-hidden />
          {pending ? "Saving…" : "Resolve"}
        </Button>
        {!event.isGroup && (
          <Button
            variant="cardAction"
            size="action"
            disabled={done || pending}
            onClick={() => resolveOne("not_carried")}
          >
            <MdBlock className="size-[15px]" aria-hidden />
            Don&apos;t carry
          </Button>
        )}
        <Button variant="cardAction" size="action">
          <MdOutlineMailOutline className="size-[15px]" aria-hidden />
          Share via email
        </Button>
        <Button variant="cardAction" size="action">
          <MdOutlineNotificationsOff className="size-[15px]" aria-hidden />
          Didn&apos;t need this
        </Button>
        <Button variant="cardAction" size="action" onClick={() => ask?.open(item)}>
          <MdOutlineChatBubbleOutline className="size-[15px]" aria-hidden />
          Ask
        </Button>
        <Button variant="cardAction" size="action" className="ml-auto text-[15px] text-ghost">
          ···
        </Button>
      </ItemCard.Actions>

      {resolving && <ResolveDialog event={event} onClose={() => setResolving(false)} />}

      {done && (
        <div className="flex items-center gap-2.5 rounded-lg border border-green-tint-line bg-green-tint px-3.5 py-2.5">
          <MdCheck className="size-3.5 flex-none text-green" aria-hidden />
          <span className="text-sm text-green">Resolved. It will drop out of the feed.</span>
        </div>
      )}
    </ItemCard>
  );
}

"use client";

import Link from "next/link";
import * as React from "react";
import { useState } from "react";
import {
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
import { ItemMedia } from "@/components/ui/item-media";
import { useAskRadar } from "@/components/ask/ask-radar-context";
import { cardCode, productCodes } from "@/lib/format";
import type { SurfacedEvent } from "@/lib/queries";
import { ResolveDialog } from "@/components/ResolveDialog";
import { ResolveConfirm } from "@/components/ResolveConfirm";
import { BriefDialog } from "@/components/BriefDialog";
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
    <div className="flex items-start gap-2.5 rounded-[2px] border border-alert-line bg-alert-bg px-3.5 py-2.5">
      <MdOutlineWarningAmber className="mt-px size-4 flex-none text-alert" aria-hidden />
      <span className="text-[13.5px]/relaxed text-alert-ink">{reason}</span>
    </div>
  );
}

/**
 * One width for the photo or barcode, whichever card carries it.
 *
 * The two card shapes had each picked their own, so the same barcode rendered
 * at 136px on a document card and 184px on a product one, and the feed looked
 * like it was zooming in and out as you scrolled. The object is the same
 * object; only its surroundings differ.
 */
const MEDIA_W = "w-[132px] flex-none md:w-[184px]";

/**
 * One labelled cell of the spec strip.
 *
 * A cell with no single answer is not empty, it is ambiguous: the source named
 * several lots or several dates and picking one would be a guess. Those cells
 * say "Multiple" and carry the source's own wording on hover, so the codes are
 * a pointer away rather than gone.
 */
function Spec({
  label,
  value,
  source,
}: {
  label: string;
  value: string | null;
  /** The raw `code_info`, shown when this cell could not be resolved. */
  source?: string | null;
}) {
  const unresolved = !value && !!source;
  // Named several, or one long enough that the source is describing a set.
  const many = unresolved && (/[;,]/.test(source!) || source!.length > 40);

  const body = (
    <span
      className={`truncate text-[14px] ${
        value
          ? "text-ink"
          : unresolved
            ? "cursor-help text-body underline decoration-dotted underline-offset-4"
            : "text-ghost"
      }`}
    >
      {value ?? (many ? "Multiple" : "N/A")}
    </span>
  );

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1 px-4 first:pl-0 last:pr-0">
      <span className="font-mono text-[10px] tracking-[0.14em] text-monoink uppercase">
        {label}
      </span>
      {unresolved ? (
        <Tooltip
          content={
            <>
              <span className="font-medium">Codes on the pack</span>
              <br />
              {source}
            </>
          }
        >
          {/* tabIndex so the codes are reachable by keyboard, not hover only */}
          <span tabIndex={0} className="relative z-[1] min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {body}
          </span>
        </Tooltip>
      ) : (
        body
      )}
    </div>
  );
}

/**
 * Brand, size and the two codes, as a strip of labelled cells.
 *
 * The lot and the best-before come from `productCodes`, which only answers
 * when the source names them unambiguously. When it cannot, the cell hands the
 * source's own wording over on hover: that string is what the owner matches
 * against the shelf, so it is never dropped just because it would not fit
 * four boxes.
 */
function SpecStrip({ product }: { product: NonNullable<SurfacedEvent["lead"]["product"]> }) {
  const { lot, bestBefore } = productCodes(product.codeInfo);

  return (
    <div className="relative z-[1] flex flex-col gap-2">
      <div className="flex items-start divide-x divide-line border-y border-line py-3">
        <Spec label="Brand" value={product.brand} />
        <Spec label="Net weight" value={product.sizes.length ? product.sizes.join(" · ") : null} />
        {/*
          `codeInfo`, not `cardCode(codeInfo)`. cardCode swaps anything long
          for the words "multiple date codes", which is exactly the case the
          hover exists to answer: the stand-in was hiding the codes it was
          standing in for.
        */}
        <Spec label="Lot code" value={lot} source={product.codeInfo} />
        <Spec label="Best before" value={bestBefore} source={product.codeInfo} />
      </div>
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
  const [briefing, setBriefing] = useState(false);
  const ask = useAskRadar();

  /*
   * A grouped card resolves through the modal, because there is a choice to
   * make per product. A single-item card confirms in a popover on the button
   * instead: the same two outcomes, over the codes restated once more.
   */
  // The banner is for "the store is affected", not "a serious recall exists":
  // a Class I recall of something you don't stock is not an emergency.
  const needsAction = item.severity === "act";

  /*
   * A card is about a product when the backend extracted one. Everything else
   * is a document: a council agenda item, a press release, a grouped recall
   * whose five members each have their own readings.
   */
  const isProduct = !event.isGroup && !!item.product?.productName;

  const meta = (
    <div className="text-[12.5px] text-faint">
      {item.timingLabel ?? item.postedLabel}
      {/*
        Older items are no longer hidden from the action tabs, so the card has
        to say how long one has been waiting. The timing line above reports the
        event's own date (when the recall was issued), which says nothing about
        how long it has sat unresolved.
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
          <span className="text-brand">
            {event.items.length} remaining of {event.allItems.length}
          </span>
        </>
      )}
    </div>
  );

  const reason = !needsAction && (
    <p className="max-w-[740px] text-[17px]/normal text-body md:text-[19px]">{item.shortReason}</p>
  );

  return (
    <ItemCard
      dimmed={done}
      interactive
      // A group has no page of its own, so the whole card toggles its product
      // list instead. The expander button stays the keyboard control.
      onCardClick={event.isGroup ? () => setExpanded((v) => !v) : undefined}
    >
      <ItemCard.Chips>
        {/* The urgent chip leads the row. It is the only one that changes what
            the reader should do next, so it should not be third. */}
        {ACTION_LABEL[item.severity] && (
          <Badge variant={needsAction ? "solidAlert" : "outline"}>
            {ACTION_LABEL[item.severity]}
          </Badge>
        )}
        <Badge>{item.sourceLabel}</Badge>
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
            {/* Never the alert fill. Class I and II both render plain: the
                class says how bad the recall is in general, not whether this
                store is affected, and "Action needed" beside it already
                carries that. Two red chips also made the class look like a
                second call to action. */}
            <Badge
              variant="outline"
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
        {/*
          Two card shapes, not one with holes in it.

          A product card is a specification: a short extracted name, a photo or
          barcode beside it, and the four readings underneath running the full
          width, because they are a table about the object.

          A document card is a piece of writing: a long source headline, the
          reason it surfaced, and a picture beside all of it. Running that one
          through the product shape left the headline alone in a row whose
          height the photo set, so the body text started a photo's height below
          the title with nothing in between.
        */}
        {isProduct ? (
          <>
            {/*
              Bottom-aligned, not top. The title runs to one line or three
              depending on the product name, so aligning the tops left the
              barcode floating above a two-line title with its own bottom
              nowhere near anything. Aligned at the foot, both columns end on
              the spec strip's rule whatever the title does.
            */}
            <div className="flex items-end gap-5">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                {/* The brand leads as a label rather than sitting in the
                    sentence: it is how the product is found on the shelf. */}
                {item.product?.brand && (
                  <span className="font-mono text-[11px] tracking-[0.14em] text-monoink uppercase">
                    {item.product.brand}
                  </span>
                )}
                <h3 className="max-w-[740px] text-[22px]/tight font-bold tracking-[-0.01em] uppercase md:text-[27px]">
                  <ItemCard.Link href={`/item/${item.decisionId}`} className="text-ink">
                    {item.displayTitle}
                  </ItemCard.Link>
                </h3>
              </div>

              <ItemMedia
                image={item.images[0]}
                upc={item.product?.upcs[0]}
                alt={`Recall photo: ${item.displayTitle}`}
                className={MEDIA_W}
              />
            </div>

            <SpecStrip product={item.product!} />
            {meta}
            {reason}
          </>
        ) : (
          <div className="flex items-start gap-5">
            <div className="flex min-w-0 flex-1 flex-col gap-2.5">
              {event.isGroup ? (
                /* Headline carries firm, count and hazard, so the card states
                   what the event is even when the banner is showing above it. */
                <h3 className="max-w-[740px] text-[20px]/tight font-medium text-ink md:text-[25px]">
                  {event.firm ?? item.sourceLabel}: {event.items.length} products
                  {event.hazard ? `, ${event.hazard}` : ""}
                </h3>
              ) : (
                <h3 className="max-w-[740px] text-[20px]/tight font-medium md:text-[25px]">
                  <ItemCard.Link href={`/item/${item.decisionId}`} className="text-ink">
                    {item.displayTitle}
                  </ItemCard.Link>
                </h3>
              )}
              {meta}
              {reason}
            </div>

            {/* Only the first photo here; the rest belong to the detail gallery. */}
            <ItemMedia
              image={item.images[0]}
              upc={item.product?.upcs[0]}
              alt={`Recall photo: ${item.displayTitle}`}
              className={`mt-0.5 ${MEDIA_W}`}
            />
          </div>
        )}

        {event.isGroup && (
          <div className="relative z-[1] flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="flex cursor-pointer items-center gap-1 self-start text-[12.5px] font-medium text-brand hover:underline"
            >
              {expanded ? "Hide the products" : `Show all ${event.items.length} products`}
              {expanded ? (
                <MdExpandLess className="size-4" aria-hidden />
              ) : (
                <MdExpandMore className="size-4" aria-hidden />
              )}
            </button>

            {expanded && (
              <ul className="m-0 flex list-none flex-col gap-px overflow-hidden rounded-[2px] border border-line bg-line p-0">
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
        {event.isGroup ? (
          <Button
            variant="cardAction"
            size="action"
            disabled={done}
            onClick={() => setResolving(true)}
          >
            <MdCheck className="size-[15px]" aria-hidden />
            Resolve
          </Button>
        ) : (
          <ResolveConfirm item={item} disabled={done} onResolved={() => setDone(true)} />
        )}
        <Button variant="cardAction" size="action" onClick={() => setBriefing(true)}>
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
      </ItemCard.Actions>

      {resolving && <ResolveDialog event={event} onClose={() => setResolving(false)} />}

      {briefing && (
        <BriefDialog
          decisionId={event.lead.decisionId}
          title={event.lead.title}
          onClose={() => setBriefing(false)}
        />
      )}

      {done && (
        <div className="flex items-center gap-2.5 rounded-lg border border-brand-tint-line bg-brand-tint px-3.5 py-2.5">
          <MdCheck className="size-3.5 flex-none text-brand" aria-hidden />
          <span className="text-sm text-brand">Resolved. It will drop out of the feed.</span>
        </div>
      )}
    </ItemCard>
  );
}

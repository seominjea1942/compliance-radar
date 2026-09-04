"use client";

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
import { Card, CardActions } from "@/components/ui/card";
import { Tooltip } from "@/components/ui/tooltip";
import { useAskRadar } from "@/components/ask/ask-radar-context";
import type { SurfacedItem } from "@/lib/queries";

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

export function SurfacedCard({ item }: { item: SurfacedItem }) {
  /**
   * "Done" is view-only. The data contract allows exactly two writes from the
   * UI (overturns and profile facts), and acknowledging an alert is neither,
   * so this collapses the card for the session and nothing else.
   */
  const [done, setDone] = useState(false);
  const ask = useAskRadar();
  // The banner is for "the store is affected", not "a serious recall exists":
  // a Class I recall of something you don't stock is not an emergency.
  const needsAction = item.severity === "act";

  return (
    <Card
      tone="inset"
      className={`gap-3.5 transition-opacity duration-300 ${done ? "opacity-55" : "opacity-100"}`}
    >
      <div className="flex flex-wrap items-center gap-2.5">
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
              className="cursor-help gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {item.classification}
              <MdInfoOutline className="size-3.5 opacity-70" aria-hidden />
            </Badge>
          </Tooltip>
        )}
      </div>

      {needsAction && <UrgentBanner reason={item.shortReason} />}

      <div className="flex flex-col gap-2.5">
        <h3 className="max-w-[740px] font-serif text-[20px]/tight font-medium md:text-[25px]">{item.title}</h3>
        <div className="text-[12.5px] text-faint">{item.timingLabel ?? item.postedLabel}</div>
        {!needsAction && (
          <p className="max-w-[740px] font-serif text-[17px]/normal text-body md:text-[19px]">
            {item.shortReason}
          </p>
        )}
      </div>

      <CardActions>
        <Button
          variant="cardAction"
          size="action"
          onClick={() => setDone(true)}
          disabled={done}
        >
          <MdCheck className="size-[15px]" aria-hidden />
          Done
        </Button>
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
      </CardActions>

      {done && (
        <div className="flex items-center gap-2.5 rounded-lg border border-green-tint-line bg-green-tint px-3.5 py-2.5">
          <MdCheck className="size-3.5 flex-none text-green" aria-hidden />
          <span className="text-sm text-green">Handled for this session.</span>
        </div>
      )}
    </Card>
  );
}

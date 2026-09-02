"use client";

import { useState } from "react";
import { AlertTriangle, BellOff, Check, Info, Mail, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardActions } from "@/components/ui/card";
import { Tooltip } from "@/components/ui/tooltip";
import type { SurfacedItem } from "@/lib/queries";

/**
 * The FDA's own recall severity scale, spelled out for anyone who doesn't read
 * enforcement reports for a living. The chip shows the FDA's term because that
 * is what the source document and any inspector will say; the tooltip carries
 * the plain-English meaning.
 */
const CLASS_MEANING: Record<string, string> = {
  "Class I": "The FDA's most serious tier: a reasonable probability of serious harm or death.",
  "Class II": "Temporary or medically reversible harm, with only a remote chance of serious harm.",
  "Class III": "Unlikely to cause harm. Usually a labelling or packaging defect.",
};

function UrgentBanner({ reason }: { reason: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-alert-line bg-alert-bg px-3.5 py-2.5">
      <AlertTriangle className="mt-px size-4 flex-none stroke-alert" strokeWidth={1.4} />
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
  const urgent = item.severity === "urgent";

  return (
    <Card
      tone={urgent ? "urgent" : "inset"}
      className={`gap-3.5 transition-opacity duration-300 ${done ? "opacity-55" : "opacity-100"}`}
    >
      <div className="flex flex-wrap items-center gap-2.5">
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
            <Badge
              variant={urgent ? "outlineAlert" : "outline"}
              tabIndex={0}
              className="cursor-help gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {item.classification}
              <Info className="size-3 opacity-70" strokeWidth={1.6} aria-hidden />
            </Badge>
          </Tooltip>
        )}
      </div>

      {urgent && <UrgentBanner reason={item.reason} />}

      <div className="flex flex-col gap-2.5">
        <h3 className="max-w-[740px] font-serif text-[20px]/tight font-medium md:text-[25px]">{item.title}</h3>
        <div className="text-[12.5px] text-faint">{item.timingLabel ?? item.postedLabel}</div>
        {!urgent && (
          <p className="max-w-[740px] font-serif text-[17px]/normal text-body md:text-[19px]">{item.reason}</p>
        )}
      </div>

      <CardActions>
        <Button
          variant="cardAction"
          size="action"
          onClick={() => setDone(true)}
          disabled={done}
        >
          <Check className="size-[15px]" strokeWidth={1.4} />
          Done
        </Button>
        <Button variant="cardAction" size="action">
          <Mail className="size-[15px]" strokeWidth={1.3} />
          Share via email
        </Button>
        <Button variant="cardAction" size="action">
          <BellOff className="size-[15px]" strokeWidth={1.3} />
          Didn&apos;t need this
        </Button>
        <Button variant="cardAction" size="action">
          <MessageCircle className="size-[15px]" strokeWidth={1.3} />
          Ask
        </Button>
        <Button variant="cardAction" size="action" className="ml-auto text-[15px] text-ghost">
          ···
        </Button>
      </CardActions>

      {done && (
        <div className="flex items-center gap-2.5 rounded-lg border border-green-tint-line bg-green-tint px-3.5 py-2.5">
          <Check className="size-3.5 flex-none stroke-green" strokeWidth={1.5} />
          <span className="text-sm text-green">Handled for this session.</span>
        </div>
      )}
    </Card>
  );
}

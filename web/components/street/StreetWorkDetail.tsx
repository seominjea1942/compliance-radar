"use client";

import { useState } from "react";
import { PermitMapView } from "@/components/PermitMapView";
import { MapHoverCard } from "@/components/street/MapHoverCard";
import { MapLegend } from "@/components/street/MapLegend";
import { Card, CardNote, CardTitle } from "@/components/ui/card";
import { plainDate } from "@/lib/format";
import { STREET_COLORS } from "@/lib/street-colors";
import {
  activePermits,
  moratoriumSegments,
  plannedPaving,
  type Permit,
  type StreetWork,
} from "@/lib/queries";

function metres(d: number | null): string {
  if (d === null) return "";
  return d >= 1000 ? `${(d / 1000).toFixed(1)} km` : `${Math.round(d)} m`;
}

/** The full record, at a size the rail card cannot give it. */
export function StreetWorkDetail({
  streetWork,
  permits,
}: {
  streetWork: StreetWork[];
  permits: Permit[];
}) {
  const [hovered, setHovered] = useState<StreetWork | null>(null);
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);

  const active = activePermits(streetWork);
  const moratorium = moratoriumSegments(streetWork);
  const planned = plannedPaving(streetWork);

  return (
    <>
      <Card className="gap-3.5">
        <PermitMapView
          permits={permits}
          streetWork={streetWork}
          onHoverWork={(w, point) => {
            setHovered(w);
            setAt(point ?? null);
          }}
          className="w-full overflow-hidden rounded-[9px] border border-line bg-wash [aspect-ratio:16/10]"
        />
        <MapLegend
          entries={[
            {
              color: STREET_COLORS.active,
              label: "Street work",
              count: active.length,
              explain:
                "An open utility permit to dig in the road. This is the kind that can close a lane or a sidewalk.",
            },
            {
              color: STREET_COLORS.planned,
              label: "Repaving",
              count: planned.length,
              explain: "A city paving project scheduled for a future year.",
            },
            {
              color: STREET_COLORS.moratorium,
              label: "No-dig",
              count: moratorium.length,
              explain:
                "Recently repaved, so the city forbids digging here. Good news: nobody can open this street for now.",
            },
            {
              color: STREET_COLORS.building,
              label: "Building",
              count: permits.length,
              explain:
                "Building permits nearby, shown for context. They rarely affect street access.",
            },
          ]}
        />
      </Card>

      <MapHoverCard work={hovered} at={at} />

      {planned.length > 0 && (
        <Section
          title="Repaving on the way"
          note="Scheduled resurfacing. Months of warning, but it closes lanes when it happens."
          items={planned}
        />
      )}

      <Section
        title="Open dig permits"
        note="Issued, unexpired and not yet signed off, so the work can still happen."
        items={active}
      />

      {moratorium.length > 0 && (
        <Card className="gap-3">
          <div className="flex flex-col gap-1.5">
            <CardTitle as="h2">Streets that cannot be dug</CardTitle>
            <CardNote>
              Recently repaved, so the city forbids opening them. Protection rather than a
              warning.
            </CardNote>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {moratorium.map((m) => (
              <span
                key={m.documentId}
                className="rounded-full border border-green-tint-line bg-green-tint px-2.5 py-1 text-[12px] text-green"
              >
                {m.segment ?? m.title}
              </span>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}

function Section({
  title,
  note,
  items,
}: {
  title: string;
  note: string;
  items: StreetWork[];
}) {
  return (
    <Card className="gap-3">
      <div className="flex flex-col gap-1.5">
        <CardTitle as="h2">
          {title} · {items.length}
        </CardTitle>
        <CardNote>{note}</CardNote>
      </div>

      <ul className="m-0 flex list-none flex-col gap-px overflow-hidden rounded-lg border border-line bg-line p-0">
        {items.map((w) => (
          <li key={w.documentId} className="flex flex-col gap-1 bg-paper px-4 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[13.5px] font-medium text-ink">
                {w.segment ?? w.title}
                {w.onStoreStreet && <span className="ml-2 text-[11.5px] text-green">your street</span>}
              </span>
              <span className="flex-none font-mono text-[11.5px] text-faint">
                {metres(w.distanceM)}
              </span>
            </div>

            {w.workDescription && (
              <span className="text-pretty text-[12.5px]/relaxed text-body">
                {w.workDescription}
              </span>
            )}

            <span className="text-[11.5px] text-faint">
              {[
                w.status,
                plainDate(w.expiryDate) && `valid through ${plainDate(w.expiryDate)}`,
                w.projectYear,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>

            {/* The radar's own reasoning, so a rejection is auditable here too. */}
            {w.shortReason && (
              <span className="text-[11.5px]/relaxed text-monoink italic">{w.shortReason}</span>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

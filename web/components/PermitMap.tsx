"use client";

import { useState } from "react";
import { MapHoverCard, type HoverTarget } from "@/components/street/MapHoverCard";
import { MapLegend } from "@/components/street/MapLegend";
import { STREET_COLORS } from "@/lib/street-colors";
import { Card, CardNote, CardTitle } from "@/components/ui/card";
import { Above, StretchedLink, stretchedCard } from "@/components/ui/stretched";
import { PermitMapView } from "@/components/PermitMapView";
import { plainDate } from "@/lib/format";
import {
  activePermits,
  blockingWork,
  moratoriumSegments,
  plannedPaving,
  type Permit,
  type StreetWork,
} from "@/lib/queries";

function metres(d: number | null): string {
  if (d === null) return "";
  return d >= 1000 ? `${(d / 1000).toFixed(1)} km` : `${Math.round(d)} m`;
}

/** "From Lincoln Ave To Iris Ct" is the useful half of a permit title. */
function where(w: StreetWork): string {
  return w.segment ?? w.title;
}

/**
 * One row per street, not per permit.
 *
 * Several permits can name the same segment, and the backend confirmed they
 * are genuinely different jobs (separate PG&E bellhole, water and pole work on
 * one block) rather than duplicates. So the count is real disruption, but the
 * street is still the thing the owner navigates by.
 */
type Segment = {
  key: string;
  where: string;
  distanceM: number | null;
  onStoreStreet: boolean;
  latest: StreetWork;
  count: number;
};

function bySegment(work: StreetWork[]): Segment[] {
  const groups = new Map<string, StreetWork[]>();
  for (const w of work) groups.set(where(w), [...(groups.get(where(w)) ?? []), w]);

  return [...groups.entries()]
    .map(([key, items]) => ({
      key,
      where: key,
      distanceM: Math.min(...items.map((i) => i.distanceM ?? Infinity)),
      onStoreStreet: items.some((i) => i.onStoreStreet),
      latest: [...items].sort((a, b) =>
        (b.issueDate ?? "").localeCompare(a.issueDate ?? ""),
      )[0]!,
      count: items.length,
    }))
    .sort((a, b) => {
      if (a.onStoreStreet !== b.onStoreStreet) return a.onStoreStreet ? -1 : 1;
      return (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity);
    });
}

/**
 * Is anything about to block the street, the sidewalk or the parking?
 *
 * Zero blocking permits is the answer, not an empty state, so the card says so
 * and then shows what it watched to be able to say it. Building permits are
 * background pins only: their approval field cannot tell live work from a
 * finished remodel.
 */
export function PermitMap({
  permits,
  streetWork,
}: {
  permits: Permit[];
  streetWork: StreetWork[];
}) {
  const blocking = blockingWork(streetWork);
  const active = activePermits(streetWork);
  const moratorium = moratoriumSegments(streetWork);
  const planned = plannedPaving(streetWork);

  // With nothing blocking, the nearest active permits are the evidence that
  // the quiet is real rather than an empty query.
  const listed = bySegment(blocking.length > 0 ? blocking : active);
  const [hovered, setHovered] = useState<HoverTarget | null>(null);
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);

  /*
   * When something is blocking, the list is the warning and earns three rows.
   * When nothing is, it is only evidence that the quiet was checked, so two
   * is enough and the card stays inside the rail.
   */
  const rowLimit = blocking.length > 0 ? 3 : 2;

  const watched = [
    active.length > 0 &&
      `${active.length} active ${active.length === 1 ? "permit" : "permits"}`,
    moratorium.length > 0 && `${moratorium.length} no-dig segments`,
    planned.length > 0 &&
      `${planned.length} planned ${planned.length === 1 ? "repaving" : "repavings"}`,
  ].filter(Boolean);

  return (
    <Card className={`w-full min-w-0 gap-3.5 p-4.5 ${stretchedCard}`}>
      <div className="flex flex-col gap-1.5">
        <CardTitle>
          {/*
            The click target is the card, not the sentence, and the hover is
            the card's own: the same treatment as an item card. The map and
            legend are lifted above the overlay so panning, zooming and marker
            hover still reach Leaflet.
          */}
          <StretchedLink href="/street-work" className="text-ink">
            {blocking.length === 0
              ? "No street work blocking your block."
              : `Street work on ${listed.length} ${
                  listed.length === 1 ? "street" : "streets"
                } near you.`}
          </StretchedLink>
        </CardTitle>
        <CardNote>
          {/*
            Say what it means before saying what was counted. "21 permits
            watched" is the radar describing its own effort; whether the
            deliveries get through is the thing the owner actually asked.
          */}
          {blocking.length === 0
            ? "Deliveries and street parking are clear. "
            : "This can close a lane or a sidewalk near your door. "}
          {watched.length > 0 && `Watching ${watched.join(", ")}`}
          {permits.length > 0 && `, plus ${permits.length} building permits`}.
        </CardNote>
      </div>

      <PermitMapView
        permits={permits}
        streetWork={streetWork}
        onHover={(target, point) => {
          setHovered(target);
          setAt(point ?? null);
        }}
        className={`relative z-[1] w-full overflow-hidden rounded-[9px] border border-line bg-wash ${
          blocking.length > 0 ? "[aspect-ratio:704/300]" : "[aspect-ratio:704/430]"
        }`}
      />

      <Above>
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
      </Above>

      <MapHoverCard target={hovered} at={at} />

      {blocking.length > 0 && listed.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {listed.slice(0, rowLimit).map((seg) => (
            <li key={seg.key} className="flex items-start gap-2 text-[11.5px]">
              <span
                className={`mt-1.5 size-1.5 flex-none rounded-full ${
                  blocking.length > 0 ? "bg-alert" : "bg-pin"
                }`}
              />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-muted">
                  {seg.where}
                  {seg.onStoreStreet && (
                    <span className="ml-1.5 text-green">your street</span>
                  )}
                </span>
                {/* City text naming the utility and the job, not generated. */}
                {seg.latest.workDescription && (
                  <span className="line-clamp-2 text-faint">{seg.latest.workDescription}</span>
                )}
                <span className="text-faint">
                  {[
                    plainDate(seg.latest.expiryDate) &&
                      `valid through ${plainDate(seg.latest.expiryDate)}`,
                    seg.count > 1 && `${seg.count} jobs`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
              <span className="mt-px flex-none font-mono text-faint">
                {metres(seg.distanceM)}
              </span>
            </li>
          ))}
          {listed.length > rowLimit && (
            <li className="text-[11.5px] text-faint">
              and {listed.length - rowLimit} more{" "}
              {listed.length - rowLimit === 1 ? "street" : "streets"}
            </li>
          )}
        </ul>
      )}
    </Card>
  );
}

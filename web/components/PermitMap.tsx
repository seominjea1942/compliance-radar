import { Card, CardNote, CardTitle } from "@/components/ui/card";
import { PermitMapView } from "@/components/PermitMapView";
import { BLOCK_RADIUS_M, onYourBlock, type Permit, type StreetWork } from "@/lib/queries";
import { plainDate } from "@/lib/format";

/** Pavement projects read differently from a dig permit, so they say so. */
const WORK_TYPE_LABEL: Record<string, string> = {
  pavement_project_future: "Repaving planned",
  pavement_project_current: "Repaving under way",
};

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
 * Four separate permits can name the same segment ("From Willow St To Longley
 * Ave" currently has four), and a list that repeats a street four times reads
 * as four places to worry about. The owner cares which streets are dug up, so
 * rows are grouped by segment and keep the nearest distance and the most
 * recent filing.
 */
type Segment = {
  key: string;
  where: string;
  distanceM: number | null;
  latest: StreetWork;
  count: number;
};

function bySegment(work: StreetWork[]): Segment[] {
  const groups = new Map<string, StreetWork[]>();
  for (const w of work) {
    const key = where(w);
    groups.set(key, [...(groups.get(key) ?? []), w]);
  }

  return [...groups.entries()]
    .map(([key, items]) => {
      const latest = [...items].sort((a, b) =>
        (b.issueDate ?? "").localeCompare(a.issueDate ?? ""),
      )[0]!;
      return {
        key,
        where: key,
        distanceM: Math.min(...items.map((i) => i.distanceM ?? Infinity)),
        latest,
        count: items.length,
      };
    })
    .sort((a, b) => (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity));
}

/**
 * The map card answers one question: is anything about to block the street,
 * the sidewalk or the parking?
 *
 * Street work is the answer. Building permits are only context: their
 * approval field cannot distinguish active work from a finished kitchen
 * remodel, so they are pins on the map and nothing more.
 */
export function PermitMap({
  permits,
  streetWork,
}: {
  permits: Permit[];
  streetWork: StreetWork[];
}) {
  const onBlock = onYourBlock(streetWork);
  const segments = bySegment(onBlock);
  const nearest = onBlock[0] ?? streetWork[0];

  return (
    <Card className="w-full min-w-0 gap-3.5 p-4.5">
      <div className="flex flex-col gap-1.5">
        <CardTitle>
          {segments.length === 0
            ? `No street work within ${BLOCK_RADIUS_M} m.`
            : `Street work on ${segments.length} ${
                segments.length === 1 ? "street" : "streets"
              } near you.`}
        </CardTitle>
        <CardNote>
          {nearest && `Nearest is ${metres(nearest.distanceM)} away, ${where(nearest)}. `}
          {permits.length > 0 &&
            `${permits.length} building ${
              permits.length === 1 ? "permit" : "permits"
            } shown as background.`}
        </CardNote>
      </div>

      <PermitMapView
        permits={permits}
        streetWork={streetWork}
        className="w-full overflow-hidden rounded-[9px] border border-line bg-wash [aspect-ratio:704/300]"
      />

      {segments.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {segments.slice(0, 3).map((seg) => (
            <li key={seg.key} className="flex items-start gap-2 text-[11.5px]">
              <span className="mt-1.5 size-1.5 flex-none rounded-full bg-alert" />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-muted">{seg.where}</span>
                <span className="text-faint">
                  {[
                    WORK_TYPE_LABEL[seg.latest.workType],
                    seg.latest.status,
                    plainDate(seg.latest.issueDate),
                    seg.count > 1 && `${seg.count} permits`,
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
          {segments.length > 3 && (
            <li className="text-[11.5px] text-faint">
              and {segments.length - 3} more {segments.length - 3 === 1 ? "street" : "streets"}{" "}
              within {BLOCK_RADIUS_M} m
            </li>
          )}
        </ul>
      )}
    </Card>
  );
}

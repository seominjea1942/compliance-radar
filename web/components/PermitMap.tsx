import { Card, CardNote, CardTitle } from "@/components/ui/card";
import { PermitMapView } from "@/components/PermitMapView";
import { type Permit } from "@/lib/queries";

function shortTitle(t: string): string {
  // Permit titles are "Work type: detail at ADDRESS, CITY ST ZIP".
  const head = t.split(" at ")[0] ?? t;
  return head.length > 26 ? head.slice(0, 25).trimEnd() + "…" : head;
}

function metres(d: number | null): string {
  if (d === null) return "";
  return d >= 1000 ? `${(d / 1000).toFixed(1)} km` : `${Math.round(d)} m`;
}

export function PermitMap({ permits }: { permits: Permit[] }) {
  const closest = permits
    .filter((p) => p.distanceM !== null)
    .sort((a, b) => a.distanceM! - b.distanceM!)
    .slice(0, 2);

  return (
    <Card className="w-full min-w-0 gap-3.5 p-4.5 lg:min-h-0 lg:flex-1">
      <div className="flex flex-col gap-1.5">
        <CardTitle>
          Watching {permits.length} nearby {permits.length === 1 ? "site" : "sites"}.
        </CardTitle>
        <CardNote>
          {permits.length} permits filed within a quarter mile.
          {closest.length > 0 && ` The closest is ${metres(closest[0]!.distanceM)} away.`}
        </CardNote>
      </div>

      {/*
        The plate had the design's 704/300 ratio, which is short for real
        tiles and pinned the card's height to its width. It now takes the
        height the rail has left, with the ratio only as a floor on narrow
        screens where the rail is not height-bound. PermitMapView already
        watches its own box and calls invalidateSize, so this is safe.
      */}
      <PermitMapView
        permits={permits}
        className="w-full min-h-[180px] overflow-hidden rounded-[9px] border border-line bg-wash [aspect-ratio:704/300] lg:aspect-auto lg:flex-1"
      />

      {closest.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {closest.map((p) => (
            <li key={p.documentId} className="flex items-baseline gap-2 text-[11.5px]">
              <span className="size-1.5 flex-none translate-y-[-1px] rounded-full bg-pin" />
              <span className="min-w-0 flex-1 truncate text-muted">{shortTitle(p.title)}</span>
              <span className="flex-none font-mono text-faint">{metres(p.distanceM)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

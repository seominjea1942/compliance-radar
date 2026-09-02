import { Card, CardNote, CardTitle } from "@/components/ui/card";
import { STORE_ANCHOR, type Permit } from "@/lib/queries";

const W = 336;
const H = 216;

/**
 * Equirectangular projection centred on the store. At this latitude and a
 * sub-kilometre span the distortion is irrelevant, so the cheap projection is
 * the right one. Longitude is compressed by cos(lat) so the plate stays square
 * in real metres.
 */
function project(permits: Permit[]) {
  const kx = Math.cos((STORE_ANCHOR.lat * Math.PI) / 180);

  const pts = permits.map((p) => ({
    permit: p,
    dx: (p.lon - STORE_ANCHOR.lon) * kx,
    dy: STORE_ANCHOR.lat - p.lat, // screen y grows downward
  }));

  /*
   * Scale to the 90th percentile rather than the furthest permit. A handful of
   * outliers would otherwise squeeze the ~70 permits near the store into an
   * unreadable blob at the centre. Anything beyond the percentile is clamped to
   * the plate edge, so it still shows as "out there" without setting the scale.
   */
  const radii = pts.map((p) => Math.hypot(p.dx, p.dy)).sort((a, b) => a - b);
  const span = Math.max(radii[Math.floor(radii.length * 0.9)] ?? 0, 1e-5);
  const scale = (Math.min(W, H) / 2 - 14) / span;

  return pts.map((p) => {
    const r = Math.hypot(p.dx, p.dy);
    // Clamp the outliers back onto the edge, keeping their direction.
    const k = r > span ? span / r : 1;
    return {
      permit: p.permit,
      x: W / 2 + p.dx * scale * k,
      y: H / 2 + p.dy * scale * k,
      clamped: r > span,
    };
  });
}

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
  const placed = project(permits);
  const closest = permits
    .filter((p) => p.distanceM !== null)
    .sort((a, b) => a.distanceM! - b.distanceM!)
    .slice(0, 2);
  const labelled = new Set(closest.map((p) => p.documentId));

  return (
    <Card className="w-full flex-none gap-3.5 p-4.5 md:w-[300px]">
      <div className="flex flex-col gap-1.5">
        <CardTitle>
          Watching {permits.length} nearby {permits.length === 1 ? "site" : "sites"}.
        </CardTitle>
        <CardNote>
          {permits.length} permits filed within a quarter mile.
          {closest.length > 0 && ` The closest is ${metres(closest[0]!.distanceM)} away.`}
        </CardNote>
      </div>

      <div className="relative min-h-[216px] flex-1 overflow-hidden rounded-[9px] border border-line bg-wash">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height="100%"
          role="img"
          aria-label={`Map of ${permits.length} permits near the store`}
        >
          {/* Streets are decorative: the design's plate, not surveyed geometry. */}
          <rect x="0" y="78" width={W} height="9" className="fill-road" />
          <rect x="0" y="166" width={W} height="6" className="fill-road-faint" />
          <rect x="106" y="0" width="8" height={H} className="fill-road" />
          <rect x="248" y="0" width="5" height={H} className="fill-road-faint" />

          {placed.map(({ permit, x, y }) => {
            const isClosest = labelled.has(permit.documentId);
            return (
              <circle
                key={permit.documentId}
                cx={x}
                cy={y}
                r={isClosest ? 5 : 4}
                className={isClosest ? "fill-pin" : "fill-pin-faint"}
              >
                <title>
                  {`${permit.title}${permit.distanceM !== null ? ` · ${metres(permit.distanceM)}` : ""}`}
                </title>
              </circle>
            );
          })}

          <circle cx={W / 2} cy={H / 2} r="14" className="fill-green/15" />
          <circle cx={W / 2} cy={H / 2} r="8" className="fill-green" />
          <text
            x={W / 2 + 13}
            y={H / 2 - 11}
            className="fill-green font-sans text-xs font-medium"
          >
            Your store
          </text>
        </svg>
      </div>

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

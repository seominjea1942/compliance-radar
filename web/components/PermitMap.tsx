import { c, f } from "@/lib/theme";
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
  const latRad = (STORE_ANCHOR.lat * Math.PI) / 180;
  const kx = Math.cos(latRad);

  const pts = permits.map((p) => ({
    permit: p,
    dx: (p.lon - STORE_ANCHOR.lon) * kx,
    dy: STORE_ANCHOR.lat - p.lat, // screen y grows downward
  }));

  const span = Math.max(
    ...pts.map((p) => Math.max(Math.abs(p.dx), Math.abs(p.dy))),
    1e-4,
  );
  // Leave a margin so edge pins and their labels stay inside the plate.
  const scale = (Math.min(W, H) / 2 - 26) / span;

  return pts.map((p) => ({
    permit: p.permit,
    x: W / 2 + p.dx * scale,
    y: H / 2 + p.dy * scale,
  }));
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
  const withDistance = permits.filter((p) => p.distanceM !== null);
  const closest = [...withDistance].sort((a, b) => a.distanceM! - b.distanceM!).slice(0, 2);
  const labelled = new Set(closest.map((p) => p.documentId));

  return (
    <section
      data-map
      style={{
        width: 372,
        flex: "none",
        background: c.paper,
        border: `1px solid ${c.line}`,
        borderRadius: 12,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <h2 style={{ margin: 0, font: `400 20px ${f.serif}` }}>
          Watching {permits.length} nearby {permits.length === 1 ? "site" : "sites"}.
        </h2>
        <p style={{ margin: 0, font: `400 14px/1.5 ${f.sans}`, color: c.faint }}>
          {permits.length} permits filed within a quarter mile in the last 90 days.
          {closest.length > 0 && (
            <>
              {" "}
              The closest is {metres(closest[0]!.distanceM)} away.
            </>
          )}
        </p>
      </div>

      <div
        style={{
          position: "relative",
          flex: 1,
          minHeight: H,
          background: c.wash,
          border: `1px solid ${c.line}`,
          borderRadius: 9,
          overflow: "hidden",
        }}
      >
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" role="img"
             aria-label={`Map of ${permits.length} permits near the store`}>
          {/* Streets are decorative: the design's plate, not surveyed geometry. */}
          <rect x="0" y="78" width={W} height="9" fill={c.road} />
          <rect x="0" y="166" width={W} height="6" fill={c.roadFaint} />
          <rect x="106" y="0" width="8" height={H} fill={c.road} />
          <rect x="248" y="0" width="5" height={H} fill={c.roadFaint} />

          {placed.map(({ permit, x, y }) => {
            const isLabelled = labelled.has(permit.documentId);
            return (
              <circle
                key={permit.documentId}
                cx={x}
                cy={y}
                r={isLabelled ? 5 : 4}
                fill={isLabelled ? c.pin : c.pinFaint}
              >
                <title>
                  {`${permit.title}${permit.distanceM !== null ? ` · ${metres(permit.distanceM)}` : ""}`}
                </title>
              </circle>
            );
          })}

          {placed
            .filter(({ permit }) => labelled.has(permit.documentId))
            .map(({ permit, x, y }) => (
              <text
                key={`l-${permit.documentId}`}
                x={x + 9}
                y={y - 6}
                fill={c.faint}
                style={{ font: `400 10.5px ${f.sans}` }}
              >
                {shortTitle(permit.title)} · {metres(permit.distanceM)}
              </text>
            ))}

          <circle cx={W / 2} cy={H / 2} r="14" fill="rgba(46,90,70,.16)" />
          <circle cx={W / 2} cy={H / 2} r="8" fill={c.green} />
          <text
            x={W / 2 + 14}
            y={H / 2 - 4}
            fill={c.green}
            style={{ font: `500 12px ${f.sans}` }}
          >
            Your store
          </text>
        </svg>
      </div>
    </section>
  );
}

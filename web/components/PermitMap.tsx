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
  const nearest = onBlock[0] ?? streetWork[0];

  return (
    <Card className="w-full min-w-0 gap-3.5 p-4.5">
      <div className="flex flex-col gap-1.5">
        <CardTitle>
          {onBlock.length === 0
            ? "No street work on your block."
            : `${onBlock.length} street-work ${
                onBlock.length === 1 ? "permit" : "permits"
              } on your block.`}
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

      {onBlock.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {onBlock.slice(0, 3).map((w) => (
            <li key={w.documentId} className="flex items-start gap-2 text-[11.5px]">
              <span className="mt-1.5 size-1.5 flex-none rounded-full bg-alert" />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-muted">{where(w)}</span>
                <span className="text-faint">
                  {[WORK_TYPE_LABEL[w.workType], plainDate(w.issueDate) && `issued ${plainDate(w.issueDate)}`]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
              <span className="mt-px flex-none font-mono text-faint">{metres(w.distanceM)}</span>
            </li>
          ))}
          {onBlock.length > 3 && (
            <li className="text-[11.5px] text-faint">
              and {onBlock.length - 3} more within {BLOCK_RADIUS_M} m
            </li>
          )}
        </ul>
      )}
    </Card>
  );
}

import Link from "next/link";
import { segmented } from "@/components/ui/segmented";
import { count } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Every state a decision can be in, in one control.
 *
 * Four of them are things the radar surfaced, ranked by what they ask of the
 * owner; two are things it did not, split by whether that call still stands.
 * They were two controls on two screens, which made the log read as a
 * different product rather than the other half of this one. The screens stay
 * separate underneath, because they page differently and their rows lead with
 * different things, but there is one control across both.
 *
 * Links, not buttons. Half of these need the server: the set-aside half is
 * 577 rows paged 25 at a time, so its filter has to be in the URL, and a
 * control that is a link for two items and a button for four is one control
 * pretending to be two again.
 */
export type DecisionTab = "act" | "check" | "file" | "all" | "set-aside" | "overturned";

export type TabCounts = Record<DecisionTab, number>;

/*
 * Order is the reading order: the three things the radar asked of you, then
 * the two it did not, then everything. "All" is last because it is the union
 * of the five before it, not a sixth state alongside them.
 */
const LABELS: { value: DecisionTab; label: string; href: string }[] = [
  { value: "act", label: "Needs action", href: "/?tier=act" },
  { value: "check", label: "To check", href: "/?tier=check" },
  { value: "file", label: "For the file", href: "/?tier=file" },
  { value: "set-aside", label: "Set aside", href: "/log" },
  { value: "overturned", label: "Overturned", href: "/log?status=overturned" },
  { value: "all", label: "All", href: "/log?status=all" },
];

export function DecisionTabs({
  active,
  counts,
  className,
}: {
  active: DecisionTab;
  counts: TabCounts;
  className?: string;
}) {
  return (
    <div className={cn(segmented.track, "self-start", className)}>
      {LABELS.map((t) => {
        const on = t.value === active;
        return (
          <Link
            key={t.value}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={cn(segmented.item, "no-underline", on ? segmented.active : segmented.idle)}
          >
            {t.label}
            <span
              className={cn(
                "font-mono text-[11px] tabular-nums",
                on ? segmented.countActive : segmented.countIdle,
              )}
            >
              {count(counts[t.value])}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Section = { id: string; label: string; count: number };

/**
 * Sticky section tabs that track scroll position.
 *
 * They are anchor links, so sections stay reachable without JS and the URL
 * carries the position; the listeners only decide which tab is lit.
 */
export function SectionTabs({ sections }: { sections: Section[] }) {
  const [active, setActive] = useState(sections[0]?.id ?? "");
  const ids = sections.map((s) => s.id).join(",");

  // The section whose top has passed the upper third of the viewport wins, so
  // the tab flips when the heading reaches reading position.
  const compute = useCallback(() => {
    const list = ids.split(",").filter(Boolean);
    let current = list[0] ?? "";
    for (const id of list) {
      const el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top < window.innerHeight * 0.35) current = id;
    }
    setActive(current);
  }, [ids]);

  useEffect(() => {
    compute();

    /*
     * Three triggers, because no single one covers every way the page moves:
     * scroll handles dragging, hashchange handles clicking a tab (an anchor
     * jump fires no scroll event), and the observer catches layout shifts such
     * as a section growing when something expands.
     */
    const io = new IntersectionObserver(compute, { threshold: [0, 0.25, 0.5, 0.75, 1] });
    for (const id of ids.split(",").filter(Boolean)) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }

    window.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("hashchange", compute);
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", compute);
      window.removeEventListener("hashchange", compute);
    };
  }, [compute, ids]);

  return (
    <div className="sticky top-0 z-10 -mx-4 flex items-stretch border-b border-line bg-paper px-4 md:-mx-12 md:px-12">
      {sections.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          aria-current={active === s.id ? "true" : undefined}
          // Clicking the tab you are already on changes no hash and fires no
          // event, so the recompute is scheduled explicitly.
          onClick={() => requestAnimationFrame(() => requestAnimationFrame(compute))}
          className={cn(
            "mr-6 flex items-baseline gap-2 border-b-2 px-0.5 py-3 no-underline transition-colors",
            active === s.id
              ? "border-ink text-ink"
              : "border-transparent text-muted hover:border-line-strong",
          )}
        >
          <span className={cn("text-sm", active === s.id ? "font-medium" : "font-normal")}>
            {s.label}
          </span>
          <span className="font-mono text-[12.5px] text-monoink">{s.count}</span>
        </a>
      ))}
    </div>
  );
}

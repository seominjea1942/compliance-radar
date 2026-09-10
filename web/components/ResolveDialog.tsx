"use client";

import { useEffect, useState, useTransition } from "react";
import { MdBlock, MdClose, MdUndo } from "react-icons/md";
import { resolveItems } from "@/app/actions";
import { Button } from "@/components/ui/button";
import type { Resolution } from "@/lib/resolution";
import type { SurfacedEvent } from "@/lib/queries";

/**
 * Per-row state. The primary control is a true binary (handled / keep open);
 * `not_carried` is the rare exception, reached by its own action rather than
 * by cycling a three-way toggle.
 */
type RowState = "handled" | "open" | "not_carried";

export function ResolveDialog({
  event,
  onClose,
}: {
  event: SurfacedEvent;
  onClose: () => void;
}) {
  const [state, setState] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(event.items.map((i) => [i.decisionId, "handled" as RowState])),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !pending && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  const set = (id: string, next: RowState) => setState((s) => ({ ...s, [id]: next }));

  const kept = event.items.filter((i) => state[i.decisionId] === "open").length;

  function save() {
    setError(null);
    const decisions = event.items
      .map((i) => ({ decisionId: i.decisionId, resolution: state[i.decisionId] }))
      .filter((d): d is { decisionId: string; resolution: Resolution } => d.resolution !== "open");

    startTransition(async () => {
      const res = await resolveItems(decisions);
      if (res.ok) onClose();
      else setError(res.error);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/25 p-4 sm:items-center"
      onClick={(e) => e.target === e.currentTarget && !pending && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Resolve this recall event"
        className="flex max-h-[88vh] w-full max-w-[520px] flex-col overflow-hidden rounded-[2px] border-2 border-rule bg-paper shadow-[0_10px_28px_-6px_rgba(25,21,17,0.16)]"
      >
        <header className="flex items-start gap-3 border-b border-line px-5 py-4">
          <div className="flex flex-1 flex-col gap-1">
            <span className="text-[15px] font-semibold text-ink">
              Resolve {event.items.length} products
            </span>
            <span className="text-pretty text-[12.5px] text-faint">
              {event.firm ?? event.lead.sourceLabel}
              {event.hazard ? ` · ${event.hazard}` : ""}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            aria-label="Close"
            className="cursor-pointer rounded-control p-1 text-faint hover:bg-hover hover:text-ink disabled:opacity-40"
          >
            <MdClose className="size-[18px]" aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          <p className="mt-0 mb-3 text-[12.5px] text-faint">
            Match the codes on the shelf. Checked means handled; uncheck to keep one open and
            it stays in your feed.
          </p>

          <ul className="m-0 flex list-none flex-col gap-px overflow-hidden border border-line bg-line p-0">
            {event.items.map((item) => {
              const st = state[item.decisionId]!;
              const notCarried = st === "not_carried";
              return (
                <li key={item.decisionId} className="flex items-start gap-3 bg-paper px-3.5 py-3">
                  <input
                    type="checkbox"
                    checked={st === "handled"}
                    disabled={notCarried || pending}
                    onChange={(e) => set(item.decisionId, e.target.checked ? "handled" : "open")}
                    aria-label={`Handled: ${item.title.slice(0, 60)}`}
                    className="mt-0.5 size-4 flex-none accent-[var(--color-brand)] disabled:opacity-40"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span
                      className={`text-[13.5px]/snug ${
                        notCarried ? "text-faint line-through" : "text-ink"
                      }`}
                    >
                      {item.displayTitle}
                    </span>

                    {/*
                      Sizes, UPCs and codes are parallel but not 1:1 aligned
                      (one row can be "QUART - BEST BY: 24 DEC 26; PINT - BEST
                      BY: 25 DEC 26"), so each renders as its own group. Zipping
                      them into columns would mispair a code with a size.
                    */}
                    {item.product && (item.product.sizes.length > 0 || item.product.upcs.length > 0) && (
                      <span className={`text-[12px] ${notCarried ? "text-ghost" : "text-faint"}`}>
                        {item.product.sizes.join(" · ")}
                        {item.product.sizes.length > 0 && item.product.upcs.length > 0 ? " · " : ""}
                        {item.product.upcs.length > 0 && (
                          <span className="font-mono">UPC {item.product.upcs.join(", ")}</span>
                        )}
                      </span>
                    )}

                    {/*
                      The code is what the owner actually matches at the shelf,
                      so it gets the strongest treatment in the row.
                    */}
                    {item.product?.codeInfo && (
                      <span
                        className={`self-start border px-1.5 py-0.5 font-mono text-[11.5px] ${
                          notCarried
                            ? "border-line bg-shell text-ghost"
                            : "border-line-strong bg-shell text-ink"
                        }`}
                      >
                        {item.product.codeInfo}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => set(item.decisionId, notCarried ? "handled" : "not_carried")}
                    title={notCarried ? "Undo" : "We don't carry this"}
                    aria-label={
                      notCarried
                        ? `Undo don't carry: ${item.title.slice(0, 40)}`
                        : `We don't carry: ${item.title.slice(0, 40)}`
                    }
                    className="flex-none cursor-pointer rounded-control p-1 text-ghost transition-colors hover:bg-hover hover:text-ink disabled:opacity-40"
                  >
                    {notCarried ? (
                      <MdUndo className="size-4" aria-hidden />
                    ) : (
                      <MdBlock className="size-4" aria-hidden />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            disabled={pending}
            onClick={() =>
              setState(
                Object.fromEntries(event.items.map((i) => [i.decisionId, "not_carried" as RowState])),
              )
            }
            className="mt-3 cursor-pointer text-[12.5px] font-medium text-brand hover:underline disabled:opacity-50"
          >
            We don&apos;t carry any of these
          </button>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-line px-5 py-4">
          <span className="text-[11.5px] text-monoink">
            {kept > 0 ? `${kept} will stay in your feed.` : "All of them will close."}
          </span>
          <div className="flex items-center gap-2">
            {error && <span className="text-[12px] text-alert">{error}</span>}
            <Button variant="ghost" size="sm" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}

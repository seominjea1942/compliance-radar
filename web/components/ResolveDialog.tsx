"use client";

import { useEffect, useState, useTransition } from "react";
import { MdBlock, MdClose, MdOutlineWarningAmber, MdUndo } from "react-icons/md";
import { resolveItems } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { bestBeforeList } from "@/lib/format";
import type { Resolution } from "@/lib/resolution";
import type { SurfacedEvent, SurfacedItem } from "@/lib/queries";

/**
 * Per-row state. The primary control is a true binary (handled / keep open);
 * `not_carried` is the rare exception, reached by its own action rather than
 * by cycling a three-way toggle.
 */
type RowState = "handled" | "open" | "not_carried";

/**
 * The words every product in the event ends with, so the modal can say them
 * once in its title instead of five times down the list.
 *
 * Whole words only: cutting mid-word would turn "Vanilla Bean ORGANIC" and
 * "Dutch Chocolate ORGANIC" into a shared suffix starting at "GANIC". A
 * suffix is only worth hoisting if it survives on every row, so one row
 * without it is enough to keep them all whole.
 */
function commonTail(titles: string[]): string {
  if (titles.length < 2) return "";
  const words = titles.map((t) => t.trim().split(/\s+/));
  const tail: string[] = [];

  for (let i = 1; i <= Math.min(...words.map((w) => w.length)) - 1; i++) {
    const word = words[0][words[0].length - i];
    if (!words.every((w) => w[w.length - i] === word)) break;
    tail.unshift(word);
  }
  return tail.join(" ");
}

/** One labelled column of a product row. Each lists its own values. */
function Field({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="font-mono text-[10px] tracking-[0.14em] text-monoink uppercase">
        {label}
      </span>
      {values.length === 0 ? (
        <span className="font-mono text-[12.5px] text-ghost">—</span>
      ) : (
        values.map((v, i) => (
          <span
            key={i}
            /*
             * Each column lists only its own values, never zipped with the
             * others. Sizes, UPCs and dates are parallel in the source but
             * not 1:1: one product reads "QUART - BEST BY: 24 DEC 26; PINT -
             * BEST BY: 25 DEC 26", and pairing them by position would put a
             * pint's date against a quart's code. The dotted rule marks the
             * break between values without claiming they line up across.
             */
            className={`truncate font-mono text-[12.5px] text-ink ${
              i > 0 ? "border-t border-dotted border-line pt-1" : ""
            }`}
          >
            {v}
          </span>
        ))
      )}
    </div>
  );
}

function Row({
  item,
  tail,
  state,
  disabled,
  onToggle,
  onNotCarried,
}: {
  item: SurfacedItem;
  tail: string;
  state: RowState;
  disabled: boolean;
  onToggle: (checked: boolean) => void;
  onNotCarried: () => void;
}) {
  const notCarried = state === "not_carried";
  const name = tail
    ? item.displayTitle.slice(0, item.displayTitle.length - tail.length).trim() ||
      item.displayTitle
    : item.displayTitle;

  return (
    <li className="flex items-start gap-4 border-b border-line py-4 last:border-b-0">
      <input
        type="checkbox"
        checked={state === "handled"}
        disabled={notCarried || disabled}
        onChange={(e) => onToggle(e.target.checked)}
        aria-label={`Handled: ${item.title.slice(0, 60)}`}
        /*
         * Square and ink, drawn by the browser through accent-color rather
         * than replaced with a div: it keeps the native focus ring, the
         * keyboard behaviour and the disabled state for free.
         */
        className="mt-1 size-[18px] flex-none appearance-none rounded-[2px] border-2 border-rule accent-[var(--color-rule)] checked:appearance-auto disabled:opacity-35"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {/* The name, its state chip and the not-carry control share one row.
            The control used to sit outside this column, nudged down by hand to
            look level with the name, which held only while the name stayed on
            one line. */}
        <div className="flex items-center gap-2.5">
          <span
            className={`min-w-0 text-[17px] font-bold tracking-[-0.01em] ${
              notCarried ? "text-ghost line-through" : "text-ink"
            }`}
          >
            {name}
          </span>
          {state === "open" && (
            <span className="border border-line-strong px-1.5 py-0.5 font-mono text-[10px] tracking-[0.14em] text-monoink uppercase">
              Stays open
            </span>
          )}
          {notCarried && (
            <span className="border border-line-strong px-1.5 py-0.5 font-mono text-[10px] tracking-[0.14em] text-monoink uppercase">
              Not carried
            </span>
          )}

          <button
            type="button"
            disabled={disabled}
            onClick={onNotCarried}
            title={notCarried ? "Undo" : "We don't carry this"}
            aria-label={
              notCarried
                ? `Undo don't carry: ${item.title.slice(0, 40)}`
                : `We don't carry: ${item.title.slice(0, 40)}`
            }
            className="ml-auto flex-none cursor-pointer rounded-[2px] p-1.5 text-ghost transition-colors hover:bg-hover hover:text-ink disabled:opacity-40"
          >
            {notCarried ? (
              <MdUndo className="size-[18px]" aria-hidden />
            ) : (
              <MdBlock className="size-[18px]" aria-hidden />
            )}
          </button>
        </div>

        <div
          /*
             Auto columns, not thirds. An equal split gave PACK and BEST BY a
             third of the row each for values that never fill it, and pushed
             them apart far enough that the eye stopped reading them as one
             product's readings.
          */
          className={`grid grid-cols-[auto_auto_auto] justify-start gap-x-7 gap-y-3 ${
            notCarried ? "opacity-45" : ""
          }`}
        >
          <Field label="Pack" values={item.product?.sizes ?? []} />
          <Field label="UPC" values={item.product?.upcs ?? []} />
          <Field label="Best by" values={bestBeforeList(item.product?.codeInfo)} />
        </div>
      </div>

    </li>
  );
}

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
  const closing = event.items.length - kept;
  const tail = commonTail(event.items.map((i) => i.displayTitle));
  // Same test the card uses to decide whether its reason is a banner.
  const urgent = event.lead.severity === "act";

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
        className="flex max-h-[88vh] w-full max-w-[560px] flex-col overflow-hidden rounded-[2px] border-2 border-rule bg-paper shadow-[0_10px_28px_-6px_rgba(25,21,17,0.16)]"
      >
        <header className="flex flex-none items-start gap-4 border-b border-line px-6 py-5">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="font-mono text-[11px] tracking-[0.16em] text-monoink uppercase">
              Resolve {event.items.length} products
            </span>
            <h2 className="text-[22px]/[1.15] font-bold tracking-[-0.02em] text-ink uppercase">
              {event.firm ?? event.lead.sourceLabel}
              {tail && (
                <>
                  <br />
                  {tail}
                </>
              )}
            </h2>
            {/*
              The card's own sentence, verbatim, and styled the way the card
              styled it. The modal opens from a card the reader has just been
              looking at; introducing a different wording here makes them stop
              and work out whether it is the same recall. The hazard field
              said "foreign metal pieces" where the card said what that meant
              for this store, which is the sentence worth repeating.
            */}
            {urgent ? (
              <span className="flex items-center gap-2 self-start border-l-2 border-alert bg-alert-bg py-1.5 pr-3 pl-2.5 text-[14px] text-alert-ink">
                <MdOutlineWarningAmber className="size-4 flex-none" aria-hidden />
                {event.lead.shortReason}
              </span>
            ) : (
              <span className="text-[14px]/relaxed text-body">{event.lead.shortReason}</span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            aria-label="Close"
            className="cursor-pointer rounded-[2px] p-1 text-faint hover:bg-hover hover:text-ink disabled:opacity-40"
          >
            <MdClose className="size-[20px]" aria-hidden />
          </button>
        </header>

        <div className="scroll-quiet min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <ul className="m-0 flex list-none flex-col p-0">
            {event.items.map((item) => (
              <Row
                key={item.decisionId}
                item={item}
                tail={tail}
                state={state[item.decisionId]!}
                disabled={pending}
                onToggle={(checked) => set(item.decisionId, checked ? "handled" : "open")}
                onNotCarried={() =>
                  set(
                    item.decisionId,
                    state[item.decisionId] === "not_carried" ? "handled" : "not_carried",
                  )
                }
              />
            ))}
          </ul>

          <button
            type="button"
            disabled={pending}
            onClick={() =>
              setState(
                Object.fromEntries(event.items.map((i) => [i.decisionId, "not_carried" as RowState])),
              )
            }
            className="mt-4 cursor-pointer text-[13.5px] font-medium text-brand hover:text-brand-deep disabled:opacity-50"
          >
            We don&apos;t carry any of these
          </button>
        </div>

        <footer className="flex flex-none items-center justify-between gap-4 border-t border-line px-6 py-4">
          <span className="font-mono text-[11px] tracking-[0.12em] text-monoink uppercase">
            {closing} will close
            {kept > 0 && ` · ${kept} stays open`}
          </span>
          <div className="flex items-center gap-3">
            {error && <span className="text-[12.5px] text-alert">{error}</span>}
            <Button variant="ghost" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button className="px-6" onClick={save} disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}

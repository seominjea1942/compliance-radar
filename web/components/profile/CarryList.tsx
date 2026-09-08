"use client";

import { useEffect, useState, useTransition } from "react";
import { MdAdd, MdClose, MdScheduleSend } from "react-icons/md";
import {
  addCarryEntry,
  editCarryEntry,
  removeCarryEntry,
} from "@/app/profile/carry-actions";
import { Button } from "@/components/ui/button";
import { nextCheckLabel } from "@/lib/next-check";
import type { CarryEntry } from "@/lib/queries";

/**
 * The carry list drives every recall match. Editing is live as of the owner's
 * 2026-09-05 sign-off: the runtime reads this profile from the DB, so a change
 * here changes how future items are triaged. Past decisions never change.
 */
export function CarryList({
  entries,
  granularity,
}: {
  entries: CarryEntry[];
  granularity: string | null;
}) {
  const [dialog, setDialog] = useState<null | { mode: "add" | "edit" | "not-carried"; entry?: CarryEntry }>(
    null,
  );

  const carried = entries.filter((e) => e.carries);
  const notCarried = entries.filter((e) => !e.carries);

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-line">
        <div className="flex items-baseline gap-4 bg-rail px-4 py-2.5 font-mono text-[10px] font-medium tracking-[0.14em] text-monoink uppercase">
          <span className="flex-1">Item</span>
          <span className="hidden w-[42%] sm:block">Brands</span>
          <span className="w-10" aria-hidden />
        </div>

        <ul className="m-0 flex list-none flex-col gap-px bg-line p-0">
          {carried.map((e) => (
            <li
              key={e.category}
              className="group flex flex-col gap-1 bg-paper px-4 py-3 transition-colors hover:bg-shell sm:flex-row sm:items-baseline sm:gap-4"
            >
              <span className="flex-1 text-[14px] text-ink">{e.category}</span>
              <span className="w-full text-[13px] text-faint sm:w-[42%]">
                {e.brands.length > 0 ? e.brands.join(", ") : "any brand"}
              </span>
              <button
                type="button"
                onClick={() => setDialog({ mode: "edit", entry: e })}
                className="w-10 flex-none cursor-pointer self-start text-left text-[12.5px] font-medium text-brand opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none sm:self-auto"
              >
                Edit
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex">
        <Button variant="outline" size="sm" onClick={() => setDialog({ mode: "add" })}>
          <MdAdd className="size-4" aria-hidden />
          Add an item
        </Button>
      </div>

      {/* Knowing what the store does NOT stock is what filters most recalls. */}
      <div className="flex flex-col gap-2.5 border-t border-line-soft pt-5">
        <span className="text-[14px] font-medium text-ink">What you don&apos;t carry</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {notCarried.map((e) => (
            <span
              key={e.category}
              className="group inline-flex items-center gap-1.5 rounded-full border border-line bg-paper py-1 pr-1.5 pl-3 text-[12.5px] text-ink transition-colors hover:border-line-strong hover:bg-hover"
            >
              {e.category}
              <button
                type="button"
                onClick={() => setDialog({ mode: "not-carried", entry: e })}
                aria-label={`Remove ${e.category}`}
                className="cursor-pointer text-ghost opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
              >
                <MdClose className="size-3.5" aria-hidden />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => setDialog({ mode: "not-carried" })}
            className="cursor-pointer rounded-full border border-dashed border-line-strong px-3 py-1 text-[12.5px] text-muted transition-colors hover:border-brand hover:bg-brand-tint hover:text-brand"
          >
            + Add something you don&apos;t carry
          </button>
        </div>
        <p className="m-0 text-[12px]/relaxed text-faint">
          Knowing what you don&apos;t stock is how I set most recalls aside.
        </p>
      </div>

      {granularity && (
        <p className="m-0 text-[12px]/relaxed text-faint">Matching granularity: {granularity}.</p>
      )}

      {dialog && (
        <CarryDialog mode={dialog.mode} entry={dialog.entry} onClose={() => setDialog(null)} />
      )}
    </>
  );
}

const COPY = {
  add: {
    title: "What else do you carry?",
    blurb:
      "A recall names a product and a brand. Give me both and I can tell whether it's yours.",
  },
  edit: { title: "Edit this item", blurb: "Change what I match recalls against." },
  "not-carried": {
    title: "What don't you carry?",
    blurb: "This is how I set most recalls aside before you ever see them.",
  },
} as const;

function CarryDialog({
  mode,
  entry,
  onClose,
}: {
  mode: "add" | "edit" | "not-carried";
  entry?: CarryEntry;
  onClose: () => void;
}) {
  const [item, setItem] = useState(entry?.category ?? "");
  const [brands, setBrands] = useState<string[]>(entry?.brands ?? []);
  const [brandDraft, setBrandDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const showBrands = mode !== "not-carried";

  // Rendered after mount: the label depends on the reader's clock, and
  // computing it during SSR would risk a hydration mismatch at 6 AM.
  const [nextCheck, setNextCheck] = useState<string | null>(null);
  useEffect(() => setNextCheck(nextCheckLabel()), []);

  function save() {
    setError(null);
    const category = item.trim();
    if (!category) {
      setError("Name the item first.");
      return;
    }
    // A brand typed but not yet committed with Enter should still count.
    const draft = brandDraft.trim();
    const allBrands = draft && !brands.includes(draft) ? [...brands, draft] : brands;

    startTransition(async () => {
      const payload = {
        category,
        carries: mode !== "not-carried",
        brands: showBrands ? allBrands : [],
      };
      const res = entry
        ? await editCarryEntry(entry.category, payload)
        : await addCarryEntry(payload);
      if (res.ok) onClose();
      else setError(res.error);
    });
  }

  function addBrand() {
    const b = brandDraft.trim();
    if (b && !brands.includes(b)) setBrands([...brands, b]);
    setBrandDraft("");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/25 p-4 sm:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={COPY[mode].title}
        className="flex w-full max-w-[460px] flex-col overflow-hidden rounded-card border border-line-strong bg-paper shadow-[0_12px_40px_rgba(24,24,27,0.2)]"
      >
        <header className="flex items-start gap-3 border-b border-line px-5 py-4">
          <div className="flex flex-1 flex-col gap-1">
            <span className="text-[15px] font-semibold text-ink">{COPY[mode].title}</span>
            <span className="text-[12.5px] text-faint">{COPY[mode].blurb}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-control p-1 text-faint hover:bg-hover hover:text-ink"
          >
            <MdClose className="size-[18px]" aria-hidden />
          </button>
        </header>

        <div className="flex flex-col gap-4 px-5 py-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-medium text-ink">What is it</span>
            <input
              autoFocus
              value={item}
              onChange={(e) => setItem(e.target.value)}
              placeholder="Cooked steak, sliced to order"
              className="rounded-[10px] border border-line-strong bg-shell px-3 py-2.5 text-[14px] text-ink placeholder:text-monoink focus:border-brand focus:outline-none"
            />
            <span className="text-[11.5px] text-faint">
              Name it the way a recall notice would: the product, not the shelf.
            </span>
          </label>

          {showBrands && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-medium text-ink">Brands</span>
              <div className="flex flex-wrap items-center gap-1.5 rounded-[10px] border border-line-strong bg-shell px-2.5 py-2">
                {brands.map((b) => (
                  <span
                    key={b}
                    className="inline-flex items-center gap-1 rounded-full border border-line bg-paper py-1 pr-1.5 pl-2.5 text-[12.5px] text-ink"
                  >
                    {b}
                    <button
                      type="button"
                      onClick={() => setBrands(brands.filter((x) => x !== b))}
                      aria-label={`Remove ${b}`}
                      className="cursor-pointer text-faint hover:text-alert"
                    >
                      <MdClose className="size-3.5" aria-hidden />
                    </button>
                  </span>
                ))}
                <input
                  value={brandDraft}
                  onChange={(e) => setBrandDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addBrand();
                    }
                  }}
                  onBlur={addBrand}
                  placeholder="Add a brand…"
                  aria-label="Add a brand"
                  className="min-w-[120px] flex-1 bg-transparent py-1 text-[13px] text-ink placeholder:text-monoink focus:outline-none"
                />
              </div>
              <span className="text-[11.5px] text-faint">
                Leave this empty and I&apos;ll flag every recall for this product, whoever made it.
              </span>
            </div>
          )}

          {/*
            The exact semantics the contract requires: when it takes effect,
            what does not change, and why the chat agent may be ahead of it.
          */}
          <div className="flex items-start gap-2.5 rounded-lg border border-line bg-shell px-3.5 py-3">
            <MdScheduleSend className="mt-px size-4 flex-none text-faint" aria-hidden />
            <div className="flex flex-col gap-1">
              <p className="m-0 text-[12.5px]/relaxed text-body">
                Applies at the next daily check{nextCheck ? `, ${nextCheck}` : ""}. Today&apos;s
                list and past decisions don&apos;t change.
              </p>
              <p className="m-0 text-[11.5px]/relaxed text-faint">
                Ask the radar sees it now, so it may mention this before the check runs.
              </p>
            </div>
          </div>

          {error && <p className="m-0 text-[12.5px] text-alert">{error}</p>}

          <div className="flex items-center justify-between gap-2">
            {entry ? (
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const res = await removeCarryEntry(entry.category);
                    if (res.ok) onClose();
                    else setError(res.error);
                  })
                }
                className="cursor-pointer rounded-control px-2 py-1.5 text-[13px] text-faint hover:text-alert disabled:opacity-50"
              >
                Remove
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onClose} disabled={pending}>
                Cancel
              </Button>
              <Button size="sm" onClick={save} disabled={pending || !item.trim()}>
                {pending ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { MdAdd, MdClose, MdLockOutline } from "react-icons/md";
import { Button } from "@/components/ui/button";
import type { CarryEntry } from "@/lib/queries";

/**
 * The carry list drives every recall match, and it is FROZEN: the contract
 * allows the UI to render an edit experience but requires human signoff before
 * anything writes to `carry_list`. Every affordance here opens the same
 * explanation rather than pretending to save.
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
                className="w-10 flex-none cursor-pointer self-start text-left text-[12.5px] font-medium text-green opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none sm:self-auto"
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
            className="cursor-pointer rounded-full border border-dashed border-line-strong px-3 py-1 text-[12.5px] text-muted transition-colors hover:border-green hover:bg-green-tint hover:text-green"
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
  const showBrands = mode !== "not-carried";

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
              className="rounded-[10px] border border-line-strong bg-shell px-3 py-2.5 text-[14px] text-ink placeholder:text-monoink focus:border-green focus:outline-none"
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

          {/* Not a soft warning: this flow genuinely cannot save yet. */}
          <div className="flex items-start gap-2.5 rounded-lg border border-line bg-shell px-3.5 py-3">
            <MdLockOutline className="mt-px size-4 flex-none text-faint" aria-hidden />
            <p className="m-0 text-[12.5px]/relaxed text-body">
              The carry list is frozen. It drives every recall match, so changes need a person to
              sign off before they go in. Nothing here saves yet.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" disabled title="Carry list writes need human signoff">
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { MdAdd, MdClose } from "react-icons/md";
import { addFact, editFact, removeFact } from "@/app/profile/actions";
import { Button } from "@/components/ui/button";
import type { StoreFact } from "@/lib/queries";

/**
 * "The basics": the facts that drive triage. These are one of the two things
 * the contract lets the UI write, so editing here is real.
 */
export function FactList({ facts }: { facts: StoreFact[] }) {
  const [editing, setEditing] = useState<StoreFact | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <>
      <ul className="m-0 flex list-none flex-col gap-px overflow-hidden rounded-lg border border-line bg-line p-0">
        {facts.map((f) => (
          <li
            key={f.id}
            className="group flex items-start gap-3 bg-paper px-4 py-3 transition-colors hover:bg-shell"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-[14.5px]/relaxed text-ink">{f.fact}</span>
              {f.implies && (
                <span className="text-[12px]/relaxed text-faint">{f.implies}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setEditing(f)}
              className="flex-none cursor-pointer rounded-control px-2 py-1 text-[12.5px] font-medium text-brand opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              Edit
            </button>
          </li>
        ))}
      </ul>

      <div className="flex">
        <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
          <MdAdd className="size-4" aria-hidden />
          Tell me something else about the store
        </Button>
      </div>

      {(adding || editing) && (
        <FactDialog
          fact={editing}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

function FactDialog({ fact, onClose }: { fact: StoreFact | null; onClose: () => void }) {
  const [text, setText] = useState(fact?.fact ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const res = fact ? await editFact(fact.id, text) : await addFact(text);
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
        aria-label={fact ? "Edit this fact" : "Tell me something else"}
        className="flex w-full max-w-[460px] flex-col overflow-hidden rounded-card border border-line-strong bg-paper shadow-[0_12px_40px_rgba(24,24,27,0.2)]"
      >
        <header className="flex items-start gap-3 border-b border-line px-5 py-4">
          <div className="flex flex-1 flex-col gap-1">
            <span className="text-[15px] font-semibold text-ink">
              {fact ? "Edit what I know" : "Tell me something else"}
            </span>
            <span className="text-[12.5px] text-faint">
              Say it plainly. I&apos;ll watch differently starting tonight.
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

        <div className="flex flex-col gap-3 px-5 py-4">
          <textarea
            autoFocus
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="You have a small parking lot with its entrance on Lincoln."
            className="w-full resize-none rounded-[10px] border border-line-strong bg-shell px-3 py-2.5 text-[14px]/relaxed text-ink placeholder:text-monoink focus:border-brand focus:outline-none"
          />
          {error && <p className="m-0 text-[12.5px] text-alert">{error}</p>}

          <div className="flex items-center justify-between gap-3">
            {fact ? (
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await removeFact(fact.id);
                    onClose();
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
              <Button size="sm" onClick={save} disabled={pending || !text.trim()}>
                {pending ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

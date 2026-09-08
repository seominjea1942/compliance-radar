"use client";

import { useEffect, useState, useTransition } from "react";
import { MdClose } from "react-icons/md";
import { overturnDecision } from "@/app/overturn-actions";
import { OVERTURN_REASONS, type OverturnReason } from "@/lib/overturn";
import type { LogRow } from "@/lib/queries";

/**
 * "Should have shown me" confirmation.
 *
 * The reason is optional by design: skipping records the overturn for this one
 * item without feeding the learning signal, which is what the copy promises.
 */
export function OverturnDialog({ row, onClose }: { row: LogRow; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !pending && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  function submit(reason?: OverturnReason) {
    setError(null);
    startTransition(async () => {
      const res = await overturnDecision(row.decisionId, reason);
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
        aria-label="Overturn this decision"
        className="flex w-full max-w-[440px] flex-col overflow-hidden rounded-card border border-line-strong bg-paper shadow-[0_12px_40px_rgba(24,24,27,0.2)]"
      >
        <header className="flex items-start gap-3 border-b border-line px-5 py-4">
          <div className="flex flex-1 flex-col gap-1">
            <span className="text-[15px] font-semibold text-ink">
              Overturned. I&apos;ll surface it.
            </span>
            <span className="text-pretty text-[12.5px] text-faint">{row.title}</span>
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
          <p className="text-[13.5px] text-body">
            Anything you want to tell me, so I judge the next one better?
          </p>

          <div className="flex flex-col gap-2">
            {OVERTURN_REASONS.map((r) => (
              <button
                key={r.value}
                type="button"
                disabled={pending}
                onClick={() => submit(r.value)}
                className="cursor-pointer rounded-[10px] border border-line bg-shell px-3.5 py-2.5 text-left text-[13.5px] text-ink transition-colors hover:border-brand-tint-line hover:bg-brand-tint disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {r.label}
              </button>
            ))}
          </div>

          {error && <p className="text-[12.5px] text-alert">{error}</p>}

          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="text-[11.5px] text-monoink">
              Optional. Skip it and nothing changes but this one item.
            </span>
            <button
              type="button"
              disabled={pending}
              onClick={() => submit()}
              className="cursor-pointer rounded-control px-3 py-1.5 text-[13px] font-medium text-brand hover:bg-hover disabled:opacity-50"
            >
              {pending ? "Saving…" : "Skip"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

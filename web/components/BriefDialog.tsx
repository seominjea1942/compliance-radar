"use client";

import { useEffect, useState } from "react";
import { MdCheck, MdClose, MdOutlineMailOutline } from "react-icons/md";
import { Button } from "@/components/ui/button";
import type { BriefResult } from "@/lib/brief";

/**
 * The forwardable brief: a plain-text email body for one item, written by the
 * runtime so the owner can hand the item to an accountant, lawyer or landlord
 * who has none of this context.
 *
 * The text is the product here, so it is shown verbatim rather than parsed
 * into sections: the runtime's four headings already carry the structure, and
 * re-formatting them here would drift from what actually gets pasted.
 */
/**
 * The four sections the runtime always returns, as the widths of their last
 * line. Uneven on purpose: four identical blocks read as a table, and the
 * point of the placeholder is that prose is coming.
 */
const BRIEF_SECTIONS = ["w-4/5", "w-3/5", "w-2/5", "w-1/2"];

export function BriefDialog({
  decisionId,
  title,
  onClose,
}: {
  decisionId: string;
  title: string;
  onClose: () => void;
}) {
  const [brief, setBrief] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  /*
   * One fetch per mount, cancelled on unmount.
   *
   * A `useRef` "already asked" guard is the tempting way to stop Strict Mode's
   * double mount from costing two Haiku calls, but it deadlocks with the
   * abort: the first cleanup cancels the only in-flight request, and the guard
   * then refuses to start another, so the dialog spins forever. Letting the
   * second mount refetch costs one aborted call in development and nothing in
   * production, where the component mounts once.
   */
  useEffect(() => {
    const ctl = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/brief", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ decisionId }),
          signal: ctl.signal,
        });
        const data = (await res.json()) as BriefResult;
        if (data.ok) setBrief(data.brief);
        else setError(data.error);
      } catch {
        if (!ctl.signal.aborted) setError("I couldn't reach the radar just now.");
      }
    })();

    return () => ctl.abort();
  }, [decisionId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function copy() {
    if (!brief) return;
    await navigator.clipboard.writeText(brief);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const mailto = brief
    ? `mailto:?subject=${encodeURIComponent(title.slice(0, 120))}&body=${encodeURIComponent(brief)}`
    : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/25 p-4 sm:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Forwardable brief"
        className="flex max-h-[88vh] w-full max-w-[540px] flex-col overflow-hidden rounded-card border border-line-strong bg-paper shadow-[0_12px_40px_rgba(24,24,27,0.2)]"
      >
        <header className="flex items-start gap-3 border-b border-line px-5 py-4">
          <div className="flex flex-1 flex-col gap-1">
            <span className="text-[15px] font-semibold text-ink">Forwardable brief</span>
            <span className="text-pretty text-[12.5px] text-faint">
              Plain text, written for someone with none of your context.
            </span>
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

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {!brief && !error && (
            <div className="flex flex-col gap-5" aria-live="polite" aria-busy>
              <span className="text-[13px] text-muted">
                Writing the brief…{" "}
                <span className="text-faint">
                  It reads the source record and drafts it fresh, so this takes about ten
                  seconds.
                </span>
              </span>

              {/*
                The shape of the answer, not a spinner. The brief always comes
                back as the same four labelled sections, so the wait can show
                what is being filled in rather than only that something is
                happening. Each block fades on its own delay, which is what
                reads as work in progress rather than a frozen placeholder.
              */}
              {BRIEF_SECTIONS.map((width, i) => (
                <div
                  key={i}
                  className="flex animate-pulse flex-col gap-2 motion-reduce:animate-none"
                  style={{ animationDelay: `${i * 180}ms` }}
                  aria-hidden
                >
                  <span className="h-2 w-24 rounded-[1px] bg-line-strong" />
                  <span className="h-2.5 w-full rounded-[1px] bg-line" />
                  <span className={`h-2.5 rounded-[1px] bg-line ${width}`} />
                </div>
              ))}
            </div>
          )}

          {error && (
            <p className="m-0 text-[13px] text-alert" aria-live="polite">
              {error}
            </p>
          )}

          {brief && (
            <p className="m-0 text-pretty whitespace-pre-wrap text-[13px]/relaxed text-ink">
              {brief}
            </p>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-line px-5 py-4">
          <span className="text-[11.5px] text-monoink">
            {brief ? "Check it before you send it." : ""}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button variant="outline" size="sm" onClick={copy} disabled={!brief}>
              {copied ? (
                <>
                  <MdCheck className="size-4" aria-hidden />
                  Copied
                </>
              ) : (
                "Copy"
              )}
            </Button>
            <Button size="sm" asChild disabled={!brief}>
              <a href={mailto ?? "#"} aria-disabled={!brief}>
                <MdOutlineMailOutline className="size-4" aria-hidden />
                Open in email
              </a>
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}

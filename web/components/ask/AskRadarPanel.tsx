"use client";

import { useEffect, useRef, useState } from "react";
import { MdArrowUpward, MdClose, MdErrorOutline } from "react-icons/md";
import { RadarFace } from "@/components/ui/radar-face";
import { AnswerText } from "./AnswerText";
import type { SurfacedItem } from "@/lib/queries";

export type Message = { id: number; from: "user" | "radar" | "error"; text: string };

const SUGGESTIONS = [
  "Why did this reach me?",
  "What should I check first?",
  "Show me what you filtered today",
];

/** Answers land in 2-9s warm; a tool-heavy question can run far longer. */
const STILL_WORKING_MS = 12_000;

/**
 * The waiting state. It escalates once, because a spinner that never changes
 * reads as a hang on a question that legitimately takes twenty seconds.
 */
function Thinking() {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSlow(true), STILL_WORKING_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="flex items-center gap-2.5 text-[13px] text-faint"
      role="status"
      aria-live="polite"
    >
      <span className="flex gap-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 animate-pulse rounded-full bg-green"
            style={{ animationDelay: `${i * 160}ms`, animationDuration: "1.1s" }}
          />
        ))}
      </span>
      {slow ? "Still checking the sources…" : "Reading the radar…"}
    </div>
  );
}

export function AskRadarPanel({
  scopedTo,
  messages,
  pending,
  onSend,
  onClose,
}: {
  scopedTo: SurfacedItem | null;
  messages: Message[];
  pending: boolean;
  onSend: (text: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  function send(text: string) {
    const body = text.trim();
    if (!body || pending) return;
    onSend(body);
    setDraft("");
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Ask the radar"
      className="fixed inset-x-0 bottom-0 z-40 flex h-[min(640px,88vh)] flex-col overflow-hidden border border-line-strong bg-paper shadow-[0_8px_28px_rgba(24,24,27,0.16)] sm:inset-x-auto sm:right-6 sm:bottom-24 sm:w-[340px] sm:rounded-card"
    >
      <header className="flex items-center gap-2.5 border-b border-line px-4 py-3.5">
        <RadarFace className="size-8 flex-none" />
        <span className="flex-1 font-serif text-[15px] font-semibold text-ink">Ask the radar</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="cursor-pointer rounded-control p-1 text-faint transition-colors hover:bg-hover hover:text-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <MdClose className="size-[18px]" aria-hidden />
        </button>
      </header>

      <div ref={logRef} className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto p-4">
        {scopedTo && (
          <div className="flex items-baseline gap-2 border-b border-line-soft pb-3 text-xs text-faint">
            <span className="flex-none font-mono text-[10px] font-medium tracking-[0.14em] text-monoink uppercase">
              About
            </span>
            <span className="text-pretty">{scopedTo.title}</span>
          </div>
        )}

        {messages.length === 0 && !pending && (
          <div className="flex flex-col gap-2.5 py-1">
            <p className="text-[13.5px]/relaxed text-faint">
              Ask about anything I watch: recalls, permits, council agendas, or why something
              was filtered out.
            </p>
            <div className="flex flex-col items-start gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="cursor-pointer rounded-full border border-line bg-shell px-3 py-1.5 text-left text-[12.5px] text-muted transition-colors hover:border-line-strong hover:text-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => {
          if (m.from === "user") {
            return (
              <div
                key={m.id}
                className="max-w-[250px] self-end rounded-xl border border-green-tint-line bg-green-tint px-3.5 py-2.5 text-sm/relaxed text-ink"
              >
                {m.text}
              </div>
            );
          }

          if (m.from === "error") {
            return (
              <div
                key={m.id}
                role="alert"
                className="flex max-w-[280px] items-start gap-2 rounded-xl border border-line bg-shell px-3.5 py-3 text-[13px]/relaxed text-faint"
              >
                <MdErrorOutline className="mt-px size-4 flex-none text-monoink" aria-hidden />
                <span className="text-pretty">{m.text}</span>
              </div>
            );
          }

          return (
            <div key={m.id} className="max-w-[290px] text-ink">
              <AnswerText text={m.text} />
            </div>
          );
        })}

        {pending && <Thinking />}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        className="flex flex-col gap-2 border-t border-line px-4 pt-3 pb-4"
      >
        <div className="flex items-center gap-2.5 rounded-[10px] border border-line-strong bg-shell px-3 py-2.5 focus-within:border-green">
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              // Enter submits explicitly rather than relying on the form's
              // implicit submission, and never mid-IME-composition: the owner
              // typing a name in Korean or Japanese would otherwise send the
              // question on the keystroke that only confirms a character.
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send(draft);
              }
            }}
            disabled={pending}
            placeholder={pending ? "Waiting for an answer…" : "Ask a follow-up…"}
            aria-label="Ask a follow-up"
            className="min-w-0 flex-1 bg-transparent text-[13.5px] text-ink placeholder:text-monoink focus:outline-none disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!draft.trim() || pending}
            aria-label="Send"
            className="flex size-7 flex-none cursor-pointer items-center justify-center rounded-full bg-green text-shell transition-opacity disabled:cursor-not-allowed disabled:opacity-35"
          >
            <MdArrowUpward className="size-4" aria-hidden />
          </button>
        </div>
        <p className="text-[11.5px] text-monoink">
          I answer from the same sources I watch, and I&apos;ll tell you when I&apos;m not sure.
        </p>
      </form>
    </div>
  );
}

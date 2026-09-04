"use client";

import { useEffect, useRef, useState } from "react";
import { MdArrowUpward, MdClose } from "react-icons/md";
import { RadarFace } from "@/components/ui/radar-face";
import type { SurfacedItem } from "@/lib/queries";

type Message = { id: number; from: "user"; text: string };

const SUGGESTIONS = [
  "Why did this reach me?",
  "What should I check first?",
  "Show me what you filtered today",
];

export function AskRadarPanel({
  scopedTo,
  onClose,
}: {
  scopedTo: SurfacedItem | null;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
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
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages]);

  function send(text: string) {
    const body = text.trim();
    if (!body) return;
    setMessages((m) => [...m, { id: Date.now(), from: "user", text: body }]);
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

        {messages.length === 0 && (
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

        {messages.map((m) => (
          <div
            key={m.id}
            className="max-w-[250px] self-end rounded-xl border border-green-tint-line bg-green-tint px-3.5 py-2.5 text-sm/relaxed text-ink"
          >
            {m.text}
          </div>
        ))}

        {messages.length > 0 && (
          /*
           * No answer is generated. Answering means an LLM call, which is a
           * new cost surface and goes through the backend's cost review first.
           * Saying so is better than faking a reply.
           */
          <div className="max-w-[280px] rounded-xl border border-line bg-shell px-3.5 py-3 text-[13px]/relaxed text-faint">
            Answering isn&apos;t connected yet. This panel is the interface only, so your
            question is not going anywhere.
          </div>
        )}
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
            placeholder="Ask a follow-up…"
            aria-label="Ask a follow-up"
            className="min-w-0 flex-1 bg-transparent text-[13.5px] text-ink placeholder:text-monoink focus:outline-none"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
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

"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  MdArrowUpward,
  MdAutoAwesome,
  MdClose,
  MdErrorOutline,
  MdOutlineDescription,
} from "react-icons/md";
import { AnswerText } from "./AnswerText";
import type { SurfacedItem } from "@/lib/queries";

export type Message = {
  id: number;
  from: "user" | "radar" | "error";
  text: string;
  /** The item that was attached when this message was sent, if any. */
  attached?: string | null;
};

/**
 * The three openers on an empty panel.
 *
 * One per thing the radar watches: recalls, street work, the council. Each is
 * answerable only from what it has already read rather than from the open
 * web, which is the distinction the first screen has to teach.
 *
 * Each also has to work cold, as the first thing said in an empty panel. An
 * earlier one asked what the radar had set aside and why, which reads as a
 * follow-up to something: it assumes the panel already told you it set
 * anything aside.
 */
const OPENERS = [
  "Does anything recalled recently match what I carry?",
  "What street work is coming near the store?",
  "Is anything on the council agenda about to affect me?",
] as const;

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
            className="size-1.5 animate-pulse rounded-full bg-brand"
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
  onClearScope,
  onClose,
}: {
  scopedTo: SurfacedItem | null;
  messages: Message[];
  pending: boolean;
  onSend: (text: string) => void;
  onClearScope: () => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  // Grow the box to the text instead of scrolling it sideways, measured from
  // scrollHeight so wrapping follows the rendered glyphs rather than a
  // character count. CSS caps it; past the cap the textarea scrolls.
  //
  // Collapsed to 0 before measuring, not to "auto". Inside the composer's
  // flex column "auto" leaves the box its laid-out height, so scrollHeight
  // comes back as whatever it already was and an empty field measured 307px.
  // From zero, scrollHeight can only be the height of the content.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    // Empty field: no computed height at all, so rows={1} governs. Measuring
    // an empty textarea on mount returned 307px inside the composer's flex
    // column, which the max-height then clamped into a box five lines deep
    // waiting for its first character.
    if (!draft) {
      el.style.height = "";
      return;
    }
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft, scopedTo]);

  useEffect(() => {
    // Only the sheet closes. Above md the panel is a column of the page, and
    // Escape there would fire at nothing.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !window.matchMedia("(min-width: 48rem)").matches) onClose();
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
      /*
        Above md the panel fills the column it is given and does no
        positioning of its own; the aside in the provider owns that. Below md
        there is no room for a column, so it is still a bottom sheet: a side
        panel on a phone is the whole screen anyway, and the thumb is at the
        bottom.
      */
      className="flex h-full w-full flex-col overflow-hidden bg-paper"
    >
      {/* The panel is summoned at every width now, so it carries its own title
          bar and close mark everywhere: nothing else on screen says what the
          floating box is or how to dismiss it. */}
      <header className="flex flex-none items-center gap-2.5 border-b border-line px-4 py-3.5">
        <span className="flex-1 text-[15px] font-semibold text-ink">Ask the radar</span>
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
        {messages.length === 0 && !pending && (
          /*
            Centred, and the only thing in the panel until a question is asked.
            The three canned prompts that used to sit here answered themselves:
            they taught the shape of a question, then filled the box with
            someone else's, and every conversation opened the same way.
          */
          <div className="flex flex-col gap-5 pt-2">
            <div className="flex flex-col gap-2.5">
              {/* No character here. The launcher stays on screen while the
                  panel is open and already carries it; a second one directly
                  above it read as two of the same thing. */}
              <h2 className="text-[19px]/snug font-semibold tracking-[-0.015em] text-balance text-ink">
                Ask me about anything I watch.
              </h2>
              <p className="text-[13px]/relaxed text-faint">
                Recalls, permits, council agendas, or why something was filtered out.
              </p>
            </div>

            {/*
              Three openers, and they are questions this radar can actually
              answer from what it already read: the store's own log, its own
              profile, its own block. Generic prompts were tried here once and
              pulled, because they taught the shape of a question and then
              filled the box with someone else's. These are shortcuts to the
              three things the panel exists for, not a script.
            */}
            {/* Three cards, not one list. Hairlines between rows made them a
                single object to be read down; separate boxes make them three
                things to be picked between, which is what they are.

                Filled rather than outlined: three outlines stacked under a
                heading read as a form to be completed. A fill reads as
                something to press, and it is the only grey on a panel that is
                otherwise white, so it carries the whole affordance. */}
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {OPENERS.map((q) => (
                <li key={q}>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => send(q)}
                    className="flex w-full cursor-pointer items-center gap-3 bg-wash px-3.5 py-3 text-left text-[13px]/snug text-ink transition-colors hover:bg-control-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="flex-1">{q}</span>
                    <MdAutoAwesome className="size-4 flex-none text-ghost" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {messages.map((m) => {
          if (m.from === "user") {
            return (
              <div key={m.id} className="flex max-w-[86%] flex-col items-end gap-1 self-end">
                {/* What went with the message, shown on the message it went with. */}
                {m.attached && (
                  <div className="flex max-w-full items-center gap-1.5 rounded-md border border-line bg-shell px-2 py-1">
                    <MdOutlineDescription className="size-3 flex-none text-monoink" aria-hidden />
                    <span className="truncate text-[11.5px] text-muted">{m.attached}</span>
                  </div>
                )}
                <div
                  /* The same darker cream the suggestions sit on, not the
                     accent tint: blue is the link colour here, and a filled
                     blue bubble made every question the reader had asked look
                     like something to click. */
                  className="bg-wash px-3.5 py-2.5 text-sm/relaxed text-ink"
                >
                  {m.text}
                </div>
              </div>
            );
          }

          if (m.from === "error") {
            return (
              <div
                key={m.id}
                role="alert"
                className="flex max-w-[92%] items-start gap-2 rounded-xl border border-line bg-shell px-3.5 py-3 text-[13px]/relaxed text-faint"
              >
                <MdErrorOutline className="mt-px size-4 flex-none text-monoink" aria-hidden />
                <span className="text-pretty">{m.text}</span>
              </div>
            );
          }

          return (
            <div key={m.id} className="max-w-full text-ink">
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
        <div className="flex flex-col gap-2 border border-line-strong bg-shell px-3 py-2.5 focus-within:border-brand">
          {scopedTo && (
            /*
              Inside the box the message is written in, not above the
              transcript. Scope is something being attached to what you are
              about to send, and it stays attached: the runtime is given this
              item on every turn until it is removed here.
            */
            <div className="flex max-w-full items-center gap-1.5 self-start rounded-md border border-line bg-paper py-1 pr-1 pl-2">
              <MdOutlineDescription className="size-3.5 flex-none text-monoink" aria-hidden />
              <span className="min-w-0 truncate text-[12px] text-muted">
                {scopedTo.displayTitle}
              </span>
              <button
                type="button"
                onClick={onClearScope}
                aria-label={`Ask without ${scopedTo.displayTitle} attached`}
                className="flex size-4 flex-none cursor-pointer items-center justify-center rounded text-ghost transition-colors hover:bg-hover hover:text-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <MdClose className="size-3" aria-hidden />
              </button>
            </div>
          )}

          <div className="flex items-end gap-2.5">
          <textarea
            ref={inputRef}
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              // A textarea takes Enter as a newline, so submitting is explicit.
              // Shift+Enter keeps the newline for a deliberate multi-line
              // question, and composition is never interrupted: the owner
              // typing in Korean or Japanese would otherwise send the question
              // on the keystroke that only confirms a character.
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send(draft);
              }
            }}
            disabled={pending}
            placeholder={pending ? "Waiting for an answer…" : "Ask a follow-up…"}
            aria-label="Ask a follow-up"
            /*
              py-[3px] makes one line of this 28px, the send button's height,
              so the row's items-end centres it instead of dropping it. The
              alignment is end so the button stays at the bottom once the box
              grows; at one line that was shoving a 22px line to the floor of
              a 28px row, 17px of air above the text and 11 below.
            */
            className="max-h-[7.5rem] min-w-0 flex-1 resize-none bg-transparent py-[3px] text-[13.5px]/relaxed text-ink placeholder:text-monoink focus:outline-none disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!draft.trim() || pending}
            aria-label="Send"
            className="flex size-7 flex-none cursor-pointer items-center justify-center bg-brand text-shell transition-opacity disabled:cursor-not-allowed disabled:opacity-35"
          >
            <MdArrowUpward className="size-4" aria-hidden />
          </button>
          </div>
        </div>
        <p className="text-[11.5px] text-monoink">
          I answer from the same sources I watch, and I&apos;ll tell you when I&apos;m not sure.
        </p>
      </form>
    </div>
  );
}

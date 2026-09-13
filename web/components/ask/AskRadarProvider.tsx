"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RadarCharacter } from "./RadarCharacter";
import { AskRadarCtx } from "./ask-radar-context";
import { type Message } from "./AskRadarPanel";
import { newSessionId, type AskRequestBody, type AskResult } from "@/lib/ask";
import type { SurfacedItem } from "@/lib/queries";

/**
 * Owns the Ask panel for the page: the floating launcher, the panel itself,
 * and the context that lets any card open it scoped to its own item.
 *
 * The conversation lives here rather than in the panel because the panel
 * unmounts on close. The runtime keeps its own history keyed by session id, so
 * state held any lower would let the agent remember an exchange the transcript
 * had already thrown away.
 */
export function AskRadarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [scopedTo, setScopedTo] = useState<SurfacedItem | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pending, setPending] = useState(false);

  // One session per tab, minted on first use and reused for every follow-up.
  const sessionId = useRef<string | null>(null);
  const inFlight = useRef<AbortController | null>(null);

  const open = useCallback((item?: SurfacedItem) => {
    setScopedTo(item ?? null);
    setIsOpen(true);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);

  const send = useCallback(
    async (text: string, scoped: SurfacedItem | null) => {
      const question = text.trim();
      if (!question || inFlight.current) return;

      sessionId.current ??= newSessionId();
      const stamp = Date.now();
      setMessages((m) => [
        ...m,
        { id: stamp, from: "user", text: question, attached: scoped?.displayTitle ?? null },
      ]);
      /*
       * The attachment is consumed here, the way a file is. It travels with
       * this one message and then leaves the composer, so a conversation about
       * an item does not keep silently re-sending it. Follow-ups still land in
       * context: the runtime keeps the history for this session id, so "which
       * lot codes exactly?" resolves against what was already asked.
       */
      setScopedTo(null);
      setPending(true);

      const controller = new AbortController();
      inFlight.current = controller;

      const body: AskRequestBody = {
        question,
        sessionId: sessionId.current,
        // Only the turn the item was attached to. Afterwards the session's own
        // history carries the thread.
        decisionId: scoped?.decisionId ?? null,
      };

      try {
        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        const result: AskResult = await res.json();

        setMessages((m) => [
          ...m,
          result.ok
            ? { id: stamp + 1, from: "radar", text: result.answer }
            : { id: stamp + 1, from: "error", text: result.error },
        ]);
      } catch {
        if (!controller.signal.aborted) {
          setMessages((m) => [
            ...m,
            { id: stamp + 1, from: "error", text: "Lost the connection. Try that again." },
          ]);
        }
      } finally {
        inFlight.current = null;
        setPending(false);
      }
    },
    [],
  );

  // The rail used to advertise ⌘K next to "Ask the radar". That row is gone,
  // so the shortcut lives here and the affordance survives.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // A question already sent is still billed and still fills the runtime's
  // history, so navigating away aborts only our wait for the answer.
  useEffect(() => () => inFlight.current?.abort(), []);

  const clearScope = useCallback(() => setScopedTo(null), []);
  const sendFromPanel = useCallback(
    (text: string) => send(text, scopedTo),
    [send, scopedTo],
  );

  const value = useMemo(
    () => ({ open, close, isOpen, scopedTo, clearScope, messages, pending, send: sendFromPanel }),
    [open, close, isOpen, scopedTo, clearScope, messages, pending, sendFromPanel],
  );

  return (
    <AskRadarCtx.Provider value={value}>
      {children}

      {/*
        The launcher. Fixed bottom-right rather than the design's top-right
        corner, because the real page scrolls for pages and a top-anchored
        control would scroll away from the reader.

        Two layers: an outlined box offset behind, and the mark over it. The
        offset is a real element rather than a box shadow, which would have to
        be a solid fill to sit behind a hard edge and would read as a smudge
        instead of a second frame. Same 2px corner as the mark, so the two
        frames are the same shape rather than one rounded inside the other.

        On hover the mark slides into the outline, which is the press the
        shape implies.
      */}
      <button
        type="button"
        onClick={() => (isOpen ? close() : open())}
        aria-expanded={isOpen}
        title="Ask the radar (⌘K)"
        aria-label={isOpen ? "Close ask the radar" : "Ask the radar (⌘K)"}
        className="group fixed right-8 bottom-8 z-50 flex size-16 cursor-pointer items-center justify-center focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        <span
          aria-hidden
          className="absolute inset-0 translate-x-[6px] translate-y-[6px] rounded-[2px] border border-rule"
        />
        <RadarCharacter
          className="relative size-full transition-transform group-hover:translate-x-[3px] group-hover:translate-y-[3px]"
          track
        />
      </button>

    </AskRadarCtx.Provider>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RadarCharacter } from "./RadarCharacter";
import { AskRadarCtx } from "./ask-radar-context";
import { AskRadarPanel, type Message } from "./AskRadarPanel";
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
      setMessages((m) => [...m, { id: stamp, from: "user", text: question }]);
      setPending(true);

      const controller = new AbortController();
      inFlight.current = controller;

      const body: AskRequestBody = {
        question,
        sessionId: sessionId.current,
        // Re-sent on every turn while the panel is scoped: the runtime treats
        // it as this turn's item, not as a sticky conversation setting.
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

  const value = useMemo(() => ({ open, close, isOpen }), [open, close, isOpen]);

  return (
    <AskRadarCtx.Provider value={value}>
      {children}

      {/*
        The design floats this in the frame's top-right. A fixed bottom-right
        launcher is used instead because the real page scrolls for pages, and a
        top-anchored control would scroll away from the reader.
      */}
      <button
        type="button"
        onClick={() => (isOpen ? close() : open())}
        aria-expanded={isOpen}
        title="Ask the radar (⌘K)"
        aria-label={isOpen ? "Close ask the radar" : "Ask the radar (⌘K)"}
        className={[
          "fixed right-6 bottom-6 z-50 size-14 cursor-pointer items-center justify-center",
          // The mark draws its own squircle, so the button carries no fill of
          // its own; the radius is matched here only so the focus ring and the
          // shadow follow the same silhouette.
          "rounded-[27%] shadow-[0_6px_18px_rgba(24,24,27,0.24)]",
          "transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
          // The panel is a full-width sheet on small screens, so the launcher
          // would sit on top of its footer. It stays a toggle on desktop.
          isOpen ? "hidden sm:flex" : "flex",
        ].join(" ")}
      >
        <RadarCharacter className="size-full" track />
      </button>

      {isOpen && (
        <AskRadarPanel
          scopedTo={scopedTo}
          messages={messages}
          pending={pending}
          onSend={(text) => send(text, scopedTo)}
          onClose={close}
        />
      )}
    </AskRadarCtx.Provider>
  );
}

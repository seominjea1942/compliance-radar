"use client";

import { useEffect, useId, useRef } from "react";
import { gazeOffset } from "./gaze";

/**
 * The radar's face: a white gradient body rising inside a green squircle, with
 * two eyes that follow the pointer.
 *
 * Drawn as one SVG so a single component covers the launcher and the panel
 * header. Gradient ids are namespaced with `useId` because the mark renders
 * more than once per page and duplicate ids in one document would make every
 * instance resolve to whichever gradient mounted first.
 */

export function RadarCharacter({
  className,
  track = false,
}: {
  className?: string;
  /** Follow the pointer. Off for static marks, so only the launcher listens. */
  track?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const svgRef = useRef<SVGSVGElement>(null);
  const eyesRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (!track) return;

    // A face that watches the cursor is decoration, and decoration that moves
    // is exactly what this query is for.
    const stillness = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (stillness.matches) return;

    let frame = 0;
    let pointer: { x: number; y: number } | null = null;

    const apply = () => {
      frame = 0;
      const eyes = eyesRef.current;
      const svg = svgRef.current;
      if (!eyes || !svg || !pointer) return;

      const box = svg.getBoundingClientRect();
      if (!box.width) return;

      const { x, y } = gazeOffset(
        pointer.x - (box.left + box.width / 2),
        pointer.y - (box.top + box.height / 2),
      );

      // Written straight to the node: this runs on every pointer move, and a
      // re-render per pixel would cost far more than the transform it sets.
      eyes.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
    };

    const onMove = (e: PointerEvent) => {
      pointer = { x: e.clientX, y: e.clientY };
      frame ||= requestAnimationFrame(apply);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [track]);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 100 100"
      className={className}
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id={`${uid}-shell`} x1="0" y1="0" x2="0" y2="1">
          {/* #10141a, lifted at the top so the squircle reads as lit from above
              rather than as a flat fill. The two upper stops are the same hue
              and saturation, raised in lightness only. */}
          <stop offset="0%" stopColor="#212a36" />
          <stop offset="55%" stopColor="#171c25" />
          <stop offset="100%" stopColor="#10141a" />
        </linearGradient>

        {/* The body is backlit rather than solid: a blurred white dome reads as
            the rim light, and a slightly smaller tinted dome sits on top of it,
            so white survives only as the glowing edge. */}
        <linearGradient id={`${uid}-body`} x1="0" y1="0" x2="0" y2="1">
          {/*
            Half the whiteness of the first version, taken 50% toward the
            palette's soft green rather than by halving it in HWB: that is the
            literal reading, but it drives the hue to a neon mint that belongs
            to no other part of this product. The eyes are near-white, so every
            point of white left in the body was contrast taken away from them.
          */}
          <stop offset="0%" stopColor="#a7ceba" />
          <stop offset="55%" stopColor="#b2d4c2" />
          <stop offset="100%" stopColor="#bedaca" />
        </linearGradient>

        <linearGradient id={`${uid}-eye`} x1="0" y1="0" x2="0" y2="1">
          {/* Lighter than the tinted body, so the eyes read as cut out of the
              glow rather than drawn on top of it. */}
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f6fdfa" />
        </linearGradient>

        <filter id={`${uid}-eyeDepth`} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="0.7" stdDeviation="0.9" floodColor="#1f4a39" floodOpacity="0.22" />
        </filter>

        <clipPath id={`${uid}-squircle`}>
          <rect width="100" height="100" rx="27" ry="27" />
        </clipPath>

        <filter id={`${uid}-soft`} x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="2.6" />
        </filter>
      </defs>

      <g clipPath={`url(#${uid}-squircle)`}>
        <rect width="100" height="100" fill={`url(#${uid}-shell)`} />

        {/* Both domes run off the bottom of the frame so the body meets the
            squircle's edges instead of floating as a circle inside it, and
            crest around a quarter of the way down, which leaves the shell
            reading across the shoulders and the eyes near the middle. */}
        <ellipse cx="50" cy="70" rx="51" ry="51" fill="#ffffff" filter={`url(#${uid}-soft)`} />
        <ellipse cx="50" cy="72" rx="46" ry="47" fill={`url(#${uid}-body)`} />

        {/*
          Level, and mirrored about the centre line. The pair was deliberately
          offset at first, copying the reference art, but at 56px an offset
          that small stops reading as character and starts reading as a squint.
          The gap between them is the one they already had.
        */}
        <g ref={eyesRef} fill={`url(#${uid}-eye)`} filter={`url(#${uid}-eyeDepth)`}>
          <ellipse cx="37" cy="54" rx="10" ry="12.9" />
          <ellipse cx="63" cy="54" rx="10" ry="12.9" />
        </g>
      </g>
    </svg>
  );
}

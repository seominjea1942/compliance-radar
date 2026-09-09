"use client";

import { useEffect, useId, useRef } from "react";
import { gazeOffset } from "./gaze";

/**
 * The radar's face: a solid blue circle cropped by a near-black square,
 * with eyes that follow the pointer.
 *
 * Flat colour, no gradients and no glow. The circle is bigger than the frame
 * and runs off the bottom and sides, so the crop is the composition rather
 * than an accident of fitting, the way a sticker sits on a button. Only the
 * clip path's id needs namespacing, since the mark renders more than once per
 * page.
 */

const SHELL = "#151515";
const FACE = "#4a90d9";

/**
 * Sclera. The pupils move inside these; the whites stay put.
 *
 * Big, and set close together with only a few units between them: that
 * spacing is most of what reads as cute rather than merely as two eyes.
 */
const EYE_RX = 12;
const EYE_RY = 12.6;
const PUPIL_RX = 8.8;
const PUPIL_RY = 9.2;
/**
 * Centred on the part of the circle you can actually see, which is neither the
 * frame's middle nor the circle's: most of the circle is outside the frame, so
 * centring on it would push the face into the cropped corner.
 */
const EYES = [
  { cx: 43, cy: 58 },
  { cx: 69, cy: 58 },
];

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
  const pupilsRef = useRef<SVGGElement>(null);

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
      const pupils = pupilsRef.current;
      const svg = svgRef.current;
      if (!pupils || !svg || !pointer) return;

      const box = svg.getBoundingClientRect();
      if (!box.width) return;

      const { x, y } = gazeOffset(
        pointer.x - (box.left + box.width / 2),
        pointer.y - (box.top + box.height / 2),
      );

      // Written straight to the node: this runs on every pointer move, and a
      // re-render per pixel would cost far more than the transform it sets.
      pupils.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
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
      /*
       * The corner is rounded in CSS, not by the clip path's rx. rx is in
       * viewBox units, so a fixed value there scales with the mark: the same
       * 27 that read as a squircle at 64px would be a different radius at any
       * other size. The clip path still does its real job, which is cropping
       * the oversized circle to the frame.
       */
      className={`overflow-hidden rounded-[2px] ${className ?? ""}`}
      aria-hidden
      focusable="false"
    >
      <defs>
        <clipPath id={`${uid}-squircle`}>
          <rect width="100" height="100" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${uid}-squircle)`}>
        <rect width="100" height="100" fill={SHELL} />

        {/*
          Off-centre and oversized: pushed down and to the right so it runs off
          two edges and leaves a black crescent along the top and left. Centred
          it read as a shape placed inside a frame; offset, it reads as one
          that carries on past it.

          The offset is what makes the black a shape of its own rather than a
          margin, so it is generous: twelve units of band at the left, sixteen
          at the top.

          Drawn as a bell once, for the Shopbell name. A silhouette cropped
          this hard has only its top half on screen, and the top half of a bell
          is a dome: it read as a ghost, not a bell. The circle is honest about
          being a face.
        */}
        <circle cx="64" cy="68" r="52" fill={FACE} />

        {EYES.map((e, i) => (
          <ellipse key={i} cx={e.cx} cy={e.cy} rx={EYE_RX} ry={EYE_RY} fill="#ffffff" />
        ))}

        {/* Only the pupils track. Moving the whole eye slides the whites around
            the face; moving the pupils inside them is what looking is. */}
        <g ref={pupilsRef} fill={SHELL}>
          {EYES.map((e, i) => (
            <ellipse key={i} cx={e.cx} cy={e.cy} rx={PUPIL_RX} ry={PUPIL_RY} />
          ))}
        </g>
      </g>
    </svg>
  );
}

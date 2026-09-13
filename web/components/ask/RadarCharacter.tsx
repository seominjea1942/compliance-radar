"use client";

import { useEffect, useId, useRef } from "react";
import { gazeOffset } from "./gaze";

/**
 * The radar's face: a solid blue circle cropped by a near-black square,
 * with a face that follows the pointer.
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
 * Eyes. Rounded rectangles, not ovals: the corner radius is a little softening
 * on a shape that is still square-shouldered, which is what the illustration
 * draws and what the rest of this interface does everywhere else.
 *
 * Sized off the illustration rather than by eye. Measured there against the
 * head it sits in: an eye is 0.052 of the diameter wide and 0.153 tall, a
 * ratio near 3:1, and the pair sits 0.106 apart centre to centre. Guessed,
 * they came out a fifth too wide, a fifth too short, and nearly twice as far
 * apart, which is what turned a close-set pair into two spaced dots.
 */
const EYE_W = 5.4;
const EYE_H = 16;
const EYE_R = 2;
/**
 * Centred on the part of the circle you can actually see, which is neither the
 * frame's middle nor the circle's: most of the circle is outside the frame, so
 * centring on it would push the face into the cropped corner.
 */
/**
 * The face at rest, looking up and to the left rather than straight out.
 *
 * Centred on the circle it read as a stare: a mark facing the reader dead-on
 * has no attitude, and this one is supposed to be watching something. Setting
 * the features up and left of centre turns the same shapes into a glance.
 *
 * Both eyes are the same width. The illustration foreshortens the far one to
 * 0.79, and copying that made one eye heavy and the other spindly: on a shape
 * 5.4 units across, a fifth off is a whole unit, which reads as a mistake
 * rather than as depth. The glance is carried by where the features sit, not
 * by their thickness.
 */
const EYES = [
  { cx: 51, cy: 50 },
  { cx: 62.1, cy: 50 },
];

/**
 * The smile, as an open arc rather than a filled shape. Set under the pair and
 * carried the same way up and left, or the mouth stays behind while the eyes
 * turn.
 */
const MOUTH = "M51 66 Q56.5 74 62 66";

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

        {/*
          Eyes and mouth travel together as one face. With whites, only the
          pupils could move: sliding the sclera around would have dragged two
          white holes across the colour. With the face drawn straight onto the
          blue there is nothing to leave behind, so the whole expression drifts
          toward the pointer, which is closer to how looking actually works.
        */}
        <g ref={pupilsRef}>
          {/* The eyes blink; the mouth does not, so they are grouped apart. */}
          <g className="radar-eyes">
            {EYES.map((e, i) => (
              <rect
                key={i}
                x={e.cx - EYE_W / 2}
                y={e.cy - EYE_H / 2}
                width={EYE_W}
                height={EYE_H}
                rx={EYE_R}
                fill={SHELL}
              />
            ))}
          </g>
          <path
            d={MOUTH}
            fill="none"
            stroke={SHELL}
            strokeWidth={3.4}
            strokeLinecap="round"
          />
        </g>
      </g>
    </svg>
  );
}

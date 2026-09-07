/**
 * Where the eyes should sit, given the pointer's offset from the face's centre.
 *
 * Split out from the component so the behaviour can be exercised without a
 * browser: the DOM side is a listener and one `setAttribute`, but the feel of
 * the thing lives entirely in this arithmetic.
 */

/**
 * How far the pupils travel from centre, in viewBox units.
 *
 * Bounded by how much white is left around them: at a pupil 73% of the sclera
 * there are 3.2 units of room, so 2.4 keeps a rim of white on the tight side
 * at full deflection instead of letting the pupil sit against the edge.
 */
export const EYE_TRAVEL = 2.4;
/** Distance at which the gaze is fully committed toward the pointer. */
export const FULL_GAZE_PX = 260;

export function gazeOffset(dx: number, dy: number): { x: number; y: number } {
  const distance = Math.hypot(dx, dy);

  // Pointer exactly on centre: there is no direction to look in.
  if (distance === 0) return { x: 0, y: 0 };

  // Unit direction, scaled in so a pointer resting nearby does not pin the
  // eyes at full deflection.
  const reach = Math.min(distance / FULL_GAZE_PX, 1) * EYE_TRAVEL;
  return { x: (dx / distance) * reach, y: (dy / distance) * reach };
}

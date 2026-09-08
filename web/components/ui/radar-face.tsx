/**
 * The radar's face mark: a brand-coloured disc, two eyes, a soft mouth. Lifted from the
 * design canvas, drawn as SVG so one component covers the launcher (40px) and
 * the panel header (32px).
 */
export function RadarFace({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden focusable="false">
      <circle cx="20" cy="20" r="20" className="fill-brand" />
      <circle cx="12" cy="17" r="3" className="fill-rail" />
      <circle cx="26" cy="17" r="3" className="fill-rail" />
      <rect x="13" y="25" width="12" height="3" rx="1.5" className="fill-brand-soft" />
    </svg>
  );
}

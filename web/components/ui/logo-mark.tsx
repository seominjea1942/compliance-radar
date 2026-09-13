/**
 * The Shopbell mark: a shop awning with the bell's clapper below it.
 *
 * Inline rather than an <img>, so it takes its colour from whatever it sits
 * in and costs no request. The source file is public/shopbell-logo.svg; two
 * things change on the way in.
 *
 * The white rect behind it goes: it was the artboard, and it would have shown
 * as a square on anything but a white bar, which is the same trap the 3D tab
 * icons fell into.
 *
 * The viewBox is tightened from the artboard's 213 square to the ink's own
 * bounds, x 39 to 175 and y 44 to 175. Left as it was, a third of the box was
 * padding, so the mark rendered small and sat high in the bar.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="39 44 136 131"
      fill="currentColor"
      // The link around this is what carries the name.
      aria-hidden
      className={className}
    >
      <path d="M156 44V124H175V145H133V65H81V145H39V124H58V44H156Z" />
      <circle cx="107" cy="160" r="15" />
    </svg>
  );
}

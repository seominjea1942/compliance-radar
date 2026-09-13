/**
 * The standing disclosure, on every page.
 *
 * This is a live demo a stranger can resolve items in, overturn rejections
 * in, and edit the store profile in. A 6:30 AM job puts those back. Saying so
 * here is the honest version of that: without it, someone who resolves a card
 * and returns the next day finds their work quietly undone and has no way to
 * know the data was ever trustworthy.
 *
 * It sits in the root layout rather than in each page, so a page added later
 * cannot forget it.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-ground">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-5 md:px-12">
        <p className="m-0 max-w-[70ch] text-[12.5px]/relaxed text-faint">
          Demo data resets every morning at 6:30 AM PT. Every item shown is real; only visitor
          actions (resolves, overturns, profile edits) are reverted.
        </p>
      </div>
    </footer>
  );
}

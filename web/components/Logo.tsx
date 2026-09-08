import { LogoMark } from "@/components/ui/logo-mark";

/**
 * The product mark in the application bar.
 *
 * Monogram and wordmark, the usual lockup: the mark alone is two letters that
 * mean nothing to a first-time reader, and the words alone give the bar no
 * anchor. The wordmark drops below sm, where the bar has three things to fit
 * in 375px and the mark still says which product this is.
 */
export function Logo() {
  return (
    <span className="flex flex-none items-center gap-2.5 select-none">
      <LogoMark className="h-[22px] w-auto flex-none text-ink" />
      <span className="hidden text-[14.5px] font-semibold tracking-[-0.01em] text-ink sm:inline">
        Compliance Radar
      </span>
    </span>
  );
}

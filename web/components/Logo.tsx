import { LogoMark } from "@/components/ui/logo-mark";

/**
 * The product mark in the application bar.
 *
 * Mark alone, no wordmark. The bar has one product in it and the name is in
 * the tab title and the page itself; spelling it out beside the monogram was
 * the lockup saying the same thing twice in 200px. The link around this
 * carries the accessible name, so nothing is lost to a screen reader.
 */
export function Logo() {
  return <LogoMark className="h-[26px] w-auto flex-none text-ink" />;
}

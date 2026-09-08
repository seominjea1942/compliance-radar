"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { MdClose, MdSearch } from "react-icons/md";
import { hrefFor, MAX_QUERY, PAGE, type ViewParams } from "@/lib/view";

/**
 * Free-text search over the set-aside log.
 *
 * The log is the argument that silence was earned, and the argument only lands
 * if a specific filtered item can be produced on demand. 700-odd rows at 25 a
 * page is not something anyone scrolls to find one brand in.
 *
 * The filtering is the server's: this only writes `?q=` and lets the page
 * re-render, so a search is a link like every other filter on this screen.
 */
export function LogSearch({ params }: { params: ViewParams }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(params.q ?? "");
  const typed = useRef(false);

  /*
   * Follow the URL when it changes underneath us (a topic pill, Back), but
   * never while the user is mid-word: re-seeding from a slower round trip
   * would drop the characters typed since it started.
   */
  useEffect(() => {
    if (!typed.current) setValue(params.q ?? "");
  }, [params.q]);

  useEffect(() => {
    if (!typed.current) return;
    const next = value.trim();
    if (next === (params.q ?? "")) return;

    const t = setTimeout(() => {
      // A new search starts at page one; keeping the grown limit would re-query
      // hundreds of rows to show the handful that match.
      startTransition(() => router.replace(hrefFor({ q: next || null, limit: PAGE }, params)));
    }, 300);
    return () => clearTimeout(t);
  }, [value, params, router]);

  function clear() {
    typed.current = true;
    setValue("");
  }

  return (
    <div
      className="flex h-9 flex-none items-center gap-1.5 rounded-full border border-line bg-paper pr-1 pl-3 transition-colors focus-within:border-line-strong"
      data-pending={pending || undefined}
    >
      <MdSearch className="size-[15px] flex-none text-faint" aria-hidden />
      <input
        type="search"
        value={value}
        maxLength={MAX_QUERY}
        onChange={(e) => {
          typed.current = true;
          setValue(e.target.value);
        }}
        placeholder="Search the log"
        aria-label="Search the log by name or reason"
        /*
         * appearance-none: Safari draws its own clear button inside a
         * type=search field, which would sit beside ours and clip the pill.
         */
        className="w-[124px] appearance-none border-0 bg-transparent p-0 text-[12.5px] text-ink outline-none placeholder:text-faint focus:w-[168px] [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear search"
          className="flex-none cursor-pointer rounded-full p-1 text-faint transition-colors hover:bg-hover hover:text-ink"
        >
          <MdClose className="size-[14px]" aria-hidden />
        </button>
      ) : (
        <span className="size-[22px] flex-none" aria-hidden />
      )}
    </div>
  );
}

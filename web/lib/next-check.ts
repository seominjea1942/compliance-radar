/**
 * When the next daily triage run happens: 6:00 AM America/Los_Angeles.
 *
 * Computed in the browser so the phrasing ("today" vs "tomorrow") matches the
 * reader's own clock rather than the server's region.
 */
const CHECK_HOUR = 6;
const TZ = "America/Los_Angeles";

/** Wall-clock hour and minute in the store's timezone, right now. */
function nowInStoreTz(): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  // Midnight can format as hour 24 in some engines.
  return { hour: get("hour") % 24, minute: get("minute") };
}

/**
 * "tomorrow, 6:00 AM", or "today, 6:00 AM" when the run has not happened yet.
 */
export function nextCheckLabel(): string {
  const { hour, minute } = nowInStoreTz();
  const beforeToday = hour < CHECK_HOUR || (hour === CHECK_HOUR && minute === 0);
  return `${beforeToday ? "today" : "tomorrow"}, 6:00 AM`;
}

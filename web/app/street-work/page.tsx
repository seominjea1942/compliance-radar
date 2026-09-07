import Link from "next/link";
import { MdArrowBack } from "react-icons/md";
import { AskRadarProvider } from "@/components/ask/AskRadarProvider";
import { Sidebar } from "@/components/Sidebar";
import { StreetWorkDetail } from "@/components/street/StreetWorkDetail";
import { Card, CardNote, CardTitle } from "@/components/ui/card";
import {
  activePermits,
  blockingWork,
  getFilteredLog,
  getNearbyPermits,
  getStoreProfile,
  getStreetWork,
  getWeeklySummary,
  moratoriumSegments,
  plannedPaving,
} from "@/lib/queries";
import { count } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function StreetWorkPage() {
  const [streetWork, permits, summary, log, profile] = await Promise.all([
    getStreetWork(),
    getNearbyPermits(),
    getWeeklySummary(),
    getFilteredLog({ status: "set-aside", limit: 1 }),
    getStoreProfile(),
  ]);

  const blocking = blockingWork(streetWork);
  const active = activePermits(streetWork);
  const moratorium = moratoriumSegments(streetWork);
  const planned = plannedPaving(streetWork);

  return (
    <AskRadarProvider>
      <div className="flex min-h-screen flex-col md:flex-row">
        <Sidebar
          profile={profile}
          surfacedCount={summary.surfaced}
          setAsideCount={log.counts.setAside}
        />

        <main className="min-w-0 flex-1">
          <div className="mx-auto flex w-full max-w-[900px] flex-col gap-5 px-4 pt-5 pb-10 md:gap-6.5 md:px-12 md:pt-7.5 md:pb-12">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-green no-underline hover:underline"
            >
              <MdArrowBack className="size-4" aria-hidden />
              Back to overview
            </Link>

            <div className="flex flex-col gap-1.5">
              <h1 className="text-[20px]/tight font-semibold tracking-[-0.01em] text-ink md:text-[23px]">
                {blocking.length === 0
                  ? "No street work blocking your block."
                  : `Street work near your door.`}
              </h1>
              <p className="max-w-[700px] text-[14.5px]/relaxed text-pretty text-body md:text-[15.5px]">
                Everything the city has filed near the store: open dig permits and paving on
                the way. Your deliveries come through the front and your customers park on the
                street, so this is the part of the public record that can close you for a
                morning.
              </p>
            </div>

            <StreetWorkDetail streetWork={streetWork} permits={permits} />

            <Card className="gap-2">
              <CardTitle as="h2">Where this comes from</CardTitle>
              <CardNote>
                Utility excavation permits and pavement projects from the city&apos;s own map
                service, checked daily. Only permits that are issued, unexpired and not yet
                finalled count as active: a permit marked accepted has been completed and signed
                off, which is the opposite of work in progress.{" "}
                {count(active.length + moratorium.length + planned.length)} street records and{" "}
                {count(permits.length)} building permits are being watched right now.
              </CardNote>
            </Card>
          </div>
        </main>
      </div>
    </AskRadarProvider>
  );
}

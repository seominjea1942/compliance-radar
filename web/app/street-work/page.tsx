import Link from "next/link";
import { MdArrowBack } from "react-icons/md";
import { AskRadarProvider } from "@/components/ask/AskRadarProvider";
import { AskRadarDock } from "@/components/ask/AskRadarDock";
import { ContextRail } from "@/components/rail/ContextRail";
import { Header } from "@/components/Header";
import { StreetWorkDetail } from "@/components/street/StreetWorkDetail";
import { Card, CardNote, CardTitle } from "@/components/ui/card";
import { PageTitle } from "@/components/ui/page-title";
import {
  activePermits,
  blockingWork,
  getNearbyPermits,
  getStoreProfile,
  getStreetWork,
  moratoriumSegments,
  plannedPaving,
} from "@/lib/queries";
import { count } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function StreetWorkPage() {
  const [streetWork, permits, profile] = await Promise.all([
    getStreetWork(),
    getNearbyPermits(),
    getStoreProfile(),
  ]);

  const blocking = blockingWork(streetWork);
  const active = activePermits(streetWork);
  const moratorium = moratoriumSegments(streetWork);
  const planned = plannedPaving(streetWork);

  return (
    <AskRadarProvider>
      <div className="flex min-h-screen flex-col bg-shell">
        <Header
          profile={profile}
        />

        {/* The bar spans the window above this row; the panel is a
            column of the row, so one header covers both. */}
        <div className="flex min-h-0 flex-1">
          {/* Rail and content share a row inside the one holding the panel:
              the panel carries no order, so as their sibling it sorted ahead
              of both at every width. */}
          <div className="flex min-w-0 flex-1 flex-col xl:flex-row">
            <ContextRail />

            <main className="order-1 min-w-0 flex-1 bg-paper xl:order-2">
              <div className="mx-auto flex w-full max-w-[900px] flex-col gap-5 px-4 pt-5 pb-10 md:gap-6.5 md:px-12 md:pt-7.5 md:pb-12">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-brand no-underline hover:underline"
                >
                  <MdArrowBack className="size-4" aria-hidden />
                  Back to overview
                </Link>

                <div className="flex flex-col gap-1.5">
                  <PageTitle>
                    {blocking.length === 0
                      ? "No street work blocking your block."
                      : `Street work near your door.`}
                  </PageTitle>
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

          <AskRadarDock />
        </div>
      </div>
    </AskRadarProvider>
  );
}

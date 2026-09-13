import Link from "next/link";
import { notFound } from "next/navigation";
import { MdArrowBack } from "react-icons/md";
import { AskRadarProvider } from "@/components/ask/AskRadarProvider";
import { AskRadarDock } from "@/components/ask/AskRadarDock";
import { Provenance } from "@/components/item/Provenance";
import { Header } from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { RailLabel } from "@/components/rail/RailLabel";
import { getDecisionDetail, getStoreProfile } from "@/lib/queries";

export const dynamic = "force-dynamic";

const TIER_LABEL: Record<string, string> = {
  act: "Action needed",
  "priority-verify": "Check soon",
  fyi: "For the file",
};

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [item, profile] = await Promise.all([getDecisionDetail(id), getStoreProfile()]);

  if (!item) notFound();

  // One screen now; a set-aside item came from the set-aside view.
  const backHref = item.surfaced ? "/" : "/?view=set-aside";

  return (
    <AskRadarProvider>
      <div className="flex min-h-screen flex-col bg-shell">
        <Header
          profile={profile}
          current="overview"
        />

        {/* The bar spans the window above this row; the panel is a
            column of the row, so one header covers both. There is no rail
            here: an item page is one record, and the overview's topic and
            street-work context has nothing to say about it. */}
        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col">
            <main className="min-w-0 flex-1 bg-paper">
              <div className="mx-auto flex w-full max-w-[800px] flex-col gap-5 px-4 pt-5 pb-10 md:gap-6.5 md:px-12 md:pt-7.5 md:pb-12">
                <Link
                  href={backHref}
                  className="inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-brand no-underline hover:underline"
                >
                  <MdArrowBack className="size-4" aria-hidden />
                  {item.surfaced ? "Back to overview" : "Back to the log"}
                </Link>

                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Badge>{item.sourceLabel}</Badge>
                    {item.severity && TIER_LABEL[item.severity] && (
                      <Badge variant={item.severity === "act" ? "solidAlert" : "outline"}>
                        {TIER_LABEL[item.severity]}
                      </Badge>
                    )}
                    {item.classification && <Badge variant="outline">{item.classification}</Badge>}
                    {item.overturned && <Badge variant="outline">Overturned</Badge>}
                  </div>

                  <h1 className="text-pretty text-[24px]/tight font-medium text-ink md:text-[30px]">
                    {item.displayTitle}
                  </h1>
                  <p className="m-0 text-[12.5px] text-faint">{item.postedLabel}</p>
                </div>

                {/* Ruled sections, not boxes. A frame around content that is
                    already on the page colour draws a rectangle and says
                    nothing; the rule under the section name is what the
                    profile and the overview rail already use to say where one
                    section ends. */}
                <section className="flex flex-col gap-3.5">
                  <RailLabel>
                    {item.surfaced ? "Why this reached you" : "Why I set this aside"}
                  </RailLabel>
                  <p className="m-0 text-pretty text-[17px]/relaxed text-body md:text-[19px]">
                    {item.reason}
                  </p>
                  {item.tags.length > 0 && (
                    /* Chips, not bare mono: bare text here is the same
                       treatment as a section label, so it read as a heading
                       with nothing beneath it. */
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[12.5px] text-faint">Topic</span>
                      {item.tags.map((t) => (
                        <Badge key={t} variant="outline">
                          {t.replace(/-/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  )}
                </section>

                {/* Its own space above: with no frames, the gap between two
                    sections is the only thing separating the end of one from
                    the name of the next. */}
                <section className="mt-8 flex flex-col gap-3.5">
                  <RailLabel>What the record says</RailLabel>
                  <Provenance source={item.source} payload={item.payload} />
                </section>
              </div>
            </main>
          </div>

          <AskRadarDock />
        </div>
      </div>
    </AskRadarProvider>
  );
}

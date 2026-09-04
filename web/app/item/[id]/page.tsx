import Link from "next/link";
import { notFound } from "next/navigation";
import { MdArrowBack } from "react-icons/md";
import { AskRadarProvider } from "@/components/ask/AskRadarProvider";
import { Provenance } from "@/components/item/Provenance";
import { Sidebar } from "@/components/Sidebar";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import {
  getDecisionDetail,
  getFilteredLog,
  getStoreProfile,
  getWeeklySummary,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

const TIER_LABEL: Record<string, string> = {
  act: "Action needed",
  "priority-verify": "Check soon",
  fyi: "For the file",
};

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [item, summary, log, profile] = await Promise.all([
    getDecisionDetail(id),
    getWeeklySummary(),
    getFilteredLog({ status: "filtered", limit: 1 }),
    getStoreProfile(),
  ]);

  if (!item) notFound();

  const backHref = item.surfaced ? "/" : "/log";

  return (
    <AskRadarProvider>
      <div className="flex min-h-screen flex-col bg-shell md:flex-row">
        <Sidebar
          profile={profile}
          surfacedCount={summary.surfaced}
          filteredCount={log.counts.filtered}
          current={item.surfaced ? "overview" : "log"}
        />

        <main className="min-w-0 flex-1 bg-paper">
          <div className="mx-auto flex w-full max-w-[800px] flex-col gap-5 px-4 pt-5 pb-10 md:gap-6.5 md:px-12 md:pt-7.5 md:pb-12">
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-green no-underline hover:underline"
            >
              <MdArrowBack className="size-4" aria-hidden />
              {item.surfaced ? "Back to overview" : "Back to the log"}
            </Link>

            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <Badge>{item.sourceLabel}</Badge>
                {item.severity && TIER_LABEL[item.severity] && (
                  <Badge variant={item.severity === "act" ? "outlineAlert" : "outline"}>
                    {TIER_LABEL[item.severity]}
                  </Badge>
                )}
                {item.classification && <Badge variant="outline">{item.classification}</Badge>}
                {item.overturned && <Badge variant="outline">Overturned</Badge>}
              </div>

              <h1 className="text-pretty font-serif text-[24px]/tight font-medium text-ink md:text-[30px]">
                {item.title}
              </h1>
              <p className="m-0 text-[12.5px] text-faint">{item.postedLabel}</p>
            </div>

            <Card className="gap-3">
              <CardTitle as="h2">
                {item.surfaced ? "Why this reached you" : "Why I set this aside"}
              </CardTitle>
              <p className="m-0 text-pretty font-serif text-[17px]/relaxed text-body md:text-[19px]">
                {item.reason}
              </p>
              {item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {item.tags.map((t) => (
                    <Badge key={t} variant="bare">
                      {t.replace(/-/g, " ")}
                    </Badge>
                  ))}
                </div>
              )}
            </Card>

            <Card className="gap-3">
              <CardTitle as="h2">What the record says</CardTitle>
              <Provenance source={item.source} payload={item.payload} />
            </Card>
          </div>
        </main>
      </div>
    </AskRadarProvider>
  );
}

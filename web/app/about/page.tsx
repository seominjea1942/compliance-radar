import { MdOpenInNew } from "react-icons/md";
import { AskRadarProvider } from "@/components/ask/AskRadarProvider";
import { Sidebar } from "@/components/Sidebar";
import { Card, CardNote, CardTitle } from "@/components/ui/card";
import { getFilteredLog, getStoreProfile, getWeeklySummary } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * Links for the hackathon writeup. Add entries here as they exist; an entry
 * with no href renders as a stated gap rather than a dead link.
 */
const LINKS: { label: string; description: string; href?: string }[] = [
  {
    label: "Source code",
    description: "Backend pipeline and this frontend. Private repository.",
    href: "https://github.com/seominjea1942/compliance-radar",
  },
  { label: "Demo video", description: "Walkthrough of a week on the radar." },
  { label: "Slides", description: "The pitch and the architecture." },
];

const STEPS = [
  {
    title: "Read everything",
    body: "FDA and USDA recall feeds, San José council agendas, and every building permit filed within a quarter mile of the store.",
  },
  {
    title: "Judge it against one store",
    body: "Each item is triaged against a written profile of this store: what it carries, what it does not, its deli counter, its parking lot, its 18 employees. Nothing is generic.",
  },
  {
    title: "Say almost nothing",
    body: "Most items are filtered, each with a reason you can read and overturn. What surfaces is ranked by what it asks of you: act, check, or file.",
  },
];

export default async function AboutPage() {
  const [summary, log, profile] = await Promise.all([
    getWeeklySummary(),
    getFilteredLog({ status: "set-aside", limit: 1 }),
    getStoreProfile(),
  ]);

  return (
    <AskRadarProvider>
      <div className="flex min-h-screen flex-col md:flex-row">
        <Sidebar
          profile={profile}
          surfacedCount={summary.surfaced}
          setAsideCount={log.counts.setAside}
          current="about"
        />

        <main className="min-w-0 flex-1">
          <div className="mx-auto flex w-full max-w-[800px] flex-col gap-5 px-4 pt-5 pb-10 md:gap-6.5 md:px-12 md:pt-7.5 md:pb-12">
            <div className="flex flex-col gap-1.5">
              <h1 className="text-[20px]/tight font-semibold tracking-[-0.01em] text-ink md:text-[23px]">
                About this project
              </h1>
              <p className="max-w-[700px] text-[14.5px]/relaxed text-pretty text-body md:text-[15.5px]">
                Compliance Radar watches the public record on behalf of one small grocery store,
                and stays quiet unless something genuinely touches it. Silence is the product.
              </p>
            </div>

            <Card className="gap-4">
              <CardTitle>How it works</CardTitle>
              <ol className="m-0 flex list-none flex-col gap-3.5 p-0">
                {STEPS.map((s, i) => (
                  <li key={s.title} className="flex gap-3">
                    <span className="mt-0.5 flex size-5 flex-none items-center justify-center rounded-full bg-rail font-mono text-[11px] text-monoink">
                      {i + 1}
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[14px] font-medium text-ink">{s.title}</span>
                      <span className="text-[13.5px]/relaxed text-body">{s.body}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </Card>

            <Card className="gap-4">
              <div className="flex flex-col gap-1.5">
                <CardTitle>Links</CardTitle>
                <CardNote>Code, demo and writeup.</CardNote>
              </div>
              <ul className="m-0 flex list-none flex-col gap-px overflow-hidden rounded-lg border border-line bg-line p-0">
                {LINKS.map((l) => (
                  <li key={l.label} className="flex items-center gap-3 bg-paper px-4 py-3">
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      {l.href ? (
                        <a
                          href={l.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[14px] font-medium text-green no-underline hover:underline"
                        >
                          {l.label}
                          <MdOpenInNew className="size-3.5" aria-hidden />
                        </a>
                      ) : (
                        <span className="text-[14px] font-medium text-ghost">{l.label}</span>
                      )}
                      <span className="text-[12.5px] text-faint">{l.description}</span>
                    </div>
                    {!l.href && (
                      <span className="flex-none font-mono text-[10px] tracking-[0.1em] text-ghost uppercase">
                        Soon
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="gap-4">
              <CardTitle>Built with</CardTitle>
              <dl className="m-0 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-[auto_1fr]">
                {[
                  ["Triage", "Amazon Bedrock via Strands agents, running on AgentCore"],
                  ["Data", "TiDB Serverless, queried through views"],
                  ["Frontend", "Next.js on Vercel, Tailwind and shadcn/ui"],
                  ["Sources", "openFDA, FDA recall feeds, Legistar, San José permits"],
                ].map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-[12.5px] text-faint sm:whitespace-nowrap">{k}</dt>
                    <dd className="m-0 text-pretty text-[13.5px] text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </div>
        </main>
      </div>
    </AskRadarProvider>
  );
}

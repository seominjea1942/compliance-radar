import { MdOpenInNew } from "react-icons/md";
import { AskRadarProvider } from "@/components/ask/AskRadarProvider";
import { AskRadarDock } from "@/components/ask/AskRadarDock";
import { Header } from "@/components/Header";
import { CardNote } from "@/components/ui/card";
import { RailLabel } from "@/components/rail/RailLabel";
import { PageTitle } from "@/components/ui/page-title";
import { getStoreProfile } from "@/lib/queries";

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
  const profile = await getStoreProfile();

  return (
    <AskRadarProvider>
      <div className="flex min-h-screen flex-col bg-ground">
        <Header
          profile={profile}
          current="about"
        />

        <div className="flex min-h-0 flex-1">
          {/* No context rail. This page is about the product, not about what
              it read this week. */}
          <div className="flex min-w-0 flex-1 flex-col">
            <main className="min-w-0 flex-1 bg-paper">
              <div className="mx-auto flex w-full max-w-[900px] flex-col gap-9 px-4 pt-5 pb-10 md:px-12 md:pt-7.5 md:pb-12">
                {/* Same masthead as every other screen: centred, held to a
                    measure inside the column, closed by its own dotted rule. */}
                <div className="flex flex-col items-center gap-3.5 border-b border-dotted border-line-strong pt-4 pb-10 text-center md:pt-8 md:pb-12">
                  <PageTitle className="max-w-[620px]">About this project</PageTitle>
                  <p className="max-w-[520px] text-[14.5px]/relaxed text-pretty text-body md:text-[15.5px]">
                    Shopbell watches the public record on behalf of one small grocery store, and
                    stays quiet unless something genuinely touches it. Silence is the product.
                  </p>
                </div>

                <section className="flex flex-col gap-4">
                  <RailLabel>How it works</RailLabel>
                  <ol className="m-0 flex list-none flex-col gap-3.5 p-0">
                    {STEPS.map((s, i) => (
                      <li key={s.title} className="flex gap-3">
                        <span className="mt-0.5 flex size-5 flex-none items-center justify-center bg-rail font-mono text-[11px] text-monoink">
                          {i + 1}
                        </span>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[14px] font-medium text-ink">{s.title}</span>
                          <span className="text-[13.5px]/relaxed text-body">{s.body}</span>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>

                <section className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <RailLabel>Links</RailLabel>
                    <CardNote>Code, demo and writeup.</CardNote>
                  </div>
                  <ul className="m-0 flex list-none flex-col gap-px overflow-hidden border border-line bg-line p-0">
                    {LINKS.map((l) => (
                      <li key={l.label} className="flex items-center gap-3 bg-paper px-4 py-3">
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          {l.href ? (
                            <a
                              href={l.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[14px] font-medium text-brand no-underline hover:underline"
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
                </section>

                <section className="flex flex-col gap-4">
                  <RailLabel>Built with</RailLabel>
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

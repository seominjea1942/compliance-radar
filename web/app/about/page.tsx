import Image from "next/image";
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
    description: "The agent, the pipeline, and this frontend. MIT licensed.",
    href: "https://github.com/seominjea1942/compliance-radar",
  },
  { label: "Demo video", description: "Walkthrough of a week on the radar." },
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
                {/* No dotted rule closing this one. The other screens use it to
                    part the masthead from a list of records; here the picture
                    below does that job, and a rule between them read as a
                    caption bar over the artwork. */}
                <div className="flex flex-col items-center gap-3.5 pt-4 pb-6 text-center md:pt-8 md:pb-8">
                  <PageTitle className="max-w-[620px]">About this project</PageTitle>
                  <p className="max-w-[520px] text-[14.5px]/relaxed text-pretty text-body md:text-[15.5px]">
                    Shopbell watches the public record on behalf of one small grocery store, and
                    stays quiet unless something genuinely touches it. Silence is the product.
                  </p>
                </div>

                {/*
                  The project's own picture, and the only decorative image in
                  the app. It earns its place here because this is the page
                  about the product rather than a page of what the product
                  read; on the feed it would argue with the thesis, which is
                  that the screen stays quiet.

                  Same artwork as the Devpost thumbnail on purpose: a judge
                  arrives from that card, and the repeat says they are in the
                  right place.

                  `priority` because it sits above the fold and is the first
                  thing this page draws; sized 1800x1200 so Next can serve the
                  right width rather than the full file.
                */}
                <Image
                  src="/about-illustration.png"
                  alt="Receipts and public notices unspooling past each other, with a checked box, a hazard sign and a watching face among them."
                  width={1800}
                  height={1200}
                  priority
                  className="mx-auto h-auto w-full max-w-[560px]"
                />

                <section className="flex flex-col gap-4">
                  <RailLabel>How it works</RailLabel>
                  <ol className="m-0 flex list-none flex-col gap-3.5 p-0">
                    {STEPS.map((s, i) => (
                      <li key={s.title} className="flex gap-3">
                        <span className="mt-0.5 flex size-5 flex-none items-center justify-center bg-rail font-mono text-[11px] text-monoink">
                          {i + 1}
                        </span>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[15px] font-medium text-ink">{s.title}</span>
                          <span className="text-[15px]/relaxed text-body">{s.body}</span>
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
                  {/*
                    A card each, two across. As stacked rows the three read as
                    one list of the same kind of thing, when a repository, a
                    video and a deck are three different destinations. A card
                    with a link that does not exist yet stays a card and says
                    so, rather than being a row with a word missing.
                  */}
                  <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2">
                    {LINKS.map((l) => {
                      const body = (
                        <>
                          <span className="flex items-center gap-1.5 text-[15px] font-medium">
                            {l.label}
                            {l.href && <MdOpenInNew className="size-4 flex-none" aria-hidden />}
                          </span>
                          <span className="text-[15px]/relaxed text-body">{l.description}</span>
                        </>
                      );
                      const box =
                        "flex h-full flex-col gap-1.5 rounded-[2px] border p-4 transition-colors";

                      return (
                        <li key={l.label}>
                          {l.href ? (
                            <a
                              href={l.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`${box} border-line-strong text-brand no-underline hover:border-rule`}
                            >
                              {body}
                            </a>
                          ) : (
                            /* Dashed, the way an unfilled value is dashed
                               everywhere else here: the card is a place held
                               open, not a link that failed. */
                            <div className={`${box} border-dashed border-line-strong text-monoink`}>
                              {body}
                              <span className="mt-auto pt-2 font-mono text-[10px] tracking-[0.14em] text-ghost uppercase">
                                Not yet
                              </span>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>

                <section className="flex flex-col gap-4">
                  <RailLabel>Built with</RailLabel>
                  {/* Ruled rows, like the profile's tables: four pairs of a
                      label and a value is a table, and it was set as a bare
                      grid with nothing marking where one row ended. */}
                  <dl className="m-0 flex flex-col p-0">
                    {[
                      ["Triage", "Amazon Bedrock via Strands agents, running on AgentCore"],
                      ["Data", "TiDB Serverless, queried through views"],
                      ["Frontend", "Next.js on Vercel, Tailwind and shadcn/ui"],
                      ["Sources", "openFDA, FDA recall feeds, Legistar, San José permits"],
                    ].map(([k, v]) => (
                      <div
                        key={k}
                        className="flex flex-col gap-1 border-b border-line py-3 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-4"
                      >
                        <dt className="font-mono text-[10px] tracking-[0.14em] text-monoink uppercase sm:w-[120px] sm:flex-none">
                          {k}
                        </dt>
                        <dd className="m-0 text-pretty text-[15px] text-ink">{v}</dd>
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

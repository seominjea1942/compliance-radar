import { AskRadarProvider } from "@/components/ask/AskRadarProvider";
import { AskRadarDock } from "@/components/ask/AskRadarDock";
import { CarryList } from "@/components/profile/CarryList";
import { SectionTabs } from "@/components/profile/SectionTabs";
import { FactList } from "@/components/profile/FactList";
import { Header } from "@/components/Header";
import { CardNote } from "@/components/ui/card";
import { RailLabel } from "@/components/rail/RailLabel";
import { PageTitle } from "@/components/ui/page-title";
import { getStoreProfileFull } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await getStoreProfileFull();

  if (!profile) {
    return (
      <div className="p-12 text-[14px] text-faint">No store profile found.</div>
    );
  }

  return (
    <AskRadarProvider>
      <div className="flex min-h-screen flex-col bg-ground">
        <Header
          profile={profile}
          current="profile"
        />

        <div className="flex min-h-0 flex-1">
          {/* No context rail here. This screen is the profile itself, and a
              column of what was read this week beside it answered a question
              nobody is asking while editing what the radar knows. */}
          <div className="flex min-w-0 flex-1 flex-col">
            <main className="min-w-0 flex-1 bg-paper">
              <div className="mx-auto flex w-full max-w-[900px] flex-col gap-9 px-4 pt-5 pb-10 md:px-12 md:pt-7.5 md:pb-12">
                {/* Same masthead as the overview: centred, held to a measure
                    well inside the column, closed by its own dotted rule. */}
                <div className="flex flex-col items-center gap-3.5 border-b border-dotted border-line-strong pt-4 pb-10 text-center md:pt-8 md:pb-12">
                  <PageTitle className="max-w-[620px]">What I know about your store</PageTitle>
                  <p className="max-w-[520px] text-[14.5px]/relaxed text-pretty text-body md:text-[15.5px]">
                    These lines came from our first conversation, not a form. Every judgment I make
                    comes from them. Change one and I&apos;ll watch differently starting tonight.
                  </p>
                </div>

                <SectionTabs
                  sections={[
                    { id: "the-basics", label: "The basics", count: profile.facts.length },
                    { id: "carry-list", label: "Carry list", count: profile.carry.entries.length },
                  ]}
                />

                <section id="the-basics" className="flex scroll-mt-16 flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <RailLabel>The basics</RailLabel>
                    <CardNote>
                      Background about the store. These shape which city items and permits I read
                      closely.
                    </CardNote>
                  </div>
                  <FactList facts={profile.facts} />
                </section>

                {/* Its own space above, beyond the column's gap: the basics table ends
                    in an add control, and 36px left that control looking like
                    it belonged to the section starting underneath it. */}
                <section id="carry-list" className="mt-12 flex scroll-mt-16 flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <RailLabel>Carry list</RailLabel>
                    <CardNote>
                      This is how I decide whether a recall is yours. A recall names a product and a
                      brand, so I match on both.
                    </CardNote>
                  </div>
                  <CarryList
                    entries={profile.carry.entries}
                    granularity={profile.carry.granularity}
                  />
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

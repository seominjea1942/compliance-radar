import { AskRadarProvider } from "@/components/ask/AskRadarProvider";
import { CarryList } from "@/components/profile/CarryList";
import { SectionTabs } from "@/components/profile/SectionTabs";
import { FactList } from "@/components/profile/FactList";
import { Sidebar } from "@/components/Sidebar";
import { CardNote, CardTitle } from "@/components/ui/card";
import { getFilteredLog, getStoreProfileFull, getWeeklySummary } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const [profile, summary, log] = await Promise.all([
    getStoreProfileFull(),
    getWeeklySummary(),
    getFilteredLog({ status: "filtered", limit: 1 }),
  ]);

  if (!profile) {
    return (
      <div className="p-12 text-[14px] text-faint">No store profile found.</div>
    );
  }

  return (
    <AskRadarProvider>
      <div className="flex min-h-screen flex-col bg-shell md:flex-row">
        <Sidebar
          profile={profile}
          surfacedCount={summary.surfaced}
          filteredCount={log.counts.filtered}
          current="profile"
        />

        <main className="min-w-0 flex-1 bg-paper">
          <div className="mx-auto flex w-full max-w-[800px] flex-col gap-5 px-4 pt-5 pb-10 md:gap-6.5 md:px-12 md:pt-7.5 md:pb-12">
            <div className="flex flex-col gap-1.5">
              <h1 className="text-[20px]/tight font-semibold tracking-[-0.01em] text-ink md:text-[23px]">
                What I know about your store
              </h1>
              <p className="max-w-[700px] text-[14.5px]/relaxed text-pretty text-body md:text-[15.5px]">
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
                <CardTitle as="h2">The basics</CardTitle>
                <CardNote>
                  Background about the store. These shape which city items and permits I read
                  closely.
                </CardNote>
              </div>
              <FactList facts={profile.facts} />
            </section>

            <section id="carry-list" className="flex scroll-mt-16 flex-col gap-4 border-t border-line-soft pt-6">
              <div className="flex flex-col gap-1.5">
                <CardTitle as="h2">Carry list</CardTitle>
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
    </AskRadarProvider>
  );
}

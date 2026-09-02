import { c, f } from "@/lib/theme";
import { Sidebar } from "@/components/Sidebar";
import { TopicTable } from "@/components/TopicTable";
import { PermitMap } from "@/components/PermitMap";
import { SurfacedCard } from "@/components/SurfacedCard";
import { getHeadline, getNearbyPermits, getStoreProfile, getSurfaced } from "@/lib/queries";
import { checkedAt, count } from "@/lib/format";

// Live operational data: never serve a build-time snapshot.
export const dynamic = "force-dynamic";

function Hero({ surfaced, reviewed }: { surfaced: number; reviewed: number }) {
  const quiet = surfaced === 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <h1 style={{ margin: 0, font: `400 25px/1.25 ${f.serif}`, color: c.ink }}>
        {quiet
          ? "Nothing needs you this week."
          : `${count(surfaced)} ${surfaced === 1 ? "thing needs" : "things need"} you.`}
      </h1>
      <p
        style={{
          margin: 0,
          font: `400 15.5px/1.55 ${f.sans}`,
          color: c.body,
          textWrap: "pretty",
          maxWidth: 700,
        }}
      >
        {quiet
          ? `I read ${count(reviewed)} items in the last 90 days. None of them touch your store.`
          : `Out of ${count(reviewed)} items read in the last 90 days. Everything else is in the log.`}
      </p>
    </div>
  );
}

export default async function HomePage() {
  const [headline, surfaced, permits, profile] = await Promise.all([
    getHeadline(),
    getSurfaced(),
    getNearbyPermits(),
    getStoreProfile(),
  ]);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: c.shell }}>
      <Sidebar
        profile={profile}
        surfacedCount={headline.surfaced}
        filteredCount={headline.filtered}
      />

      <main style={{ flex: 1, minWidth: 0, background: c.shell }}>
        <div data-main style={{ padding: "30px 48px 48px", display: "flex", flexDirection: "column", gap: 26 }}>
          <section
            style={{
              background: c.paper,
              border: `1px solid ${c.line}`,
              borderRadius: 12,
              padding: "22px 26px",
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            <Hero surfaced={headline.surfaced} reviewed={headline.reviewed} />

            {surfaced.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {surfaced.map((item) => (
                  <SurfacedCard key={item.decisionId} item={item} />
                ))}
              </div>
            )}
          </section>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "stretch" }}>
            <TopicTable
              reviewed={headline.reviewed}
              filtered={headline.filtered}
              checked={checkedAt(headline.lastCheckedUtc)}
              topics={headline.topics}
            />
            {permits.length > 0 && <PermitMap permits={permits} />}
          </div>
        </div>
      </main>
    </div>
  );
}

import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { readDailyOverview } from "@/lib/store/counters";
import { dayStamp, EUR_PER_ANALYSIS } from "@/lib/store/keys";

export const dynamic = "force-dynamic";

/**
 * Intern dagoverzicht (kosten + gebruik). Beschermd via een expliciete
 * sessie-check — dus óók afgeschermd wanneer `AUTH_REQUIRED=false` de rest van
 * de site publiek maakt. Toont uitsluitend site-brede dag-aggregaten; SpatialLab
 * bewaart geen persoonsdata, dus "bezoekers" is een HyperLogLog-schatting, geen
 * lijst. (De namenlijst van testers komt straks uit het comms-platform.)
 */
export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const o = await readDailyOverview();
  const today = dayStamp(new Date());

  return (
    <main
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "2rem 1.25rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>SpatialLab · dagoverzicht</h1>
      <p style={{ color: "#666", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
        {today} (UTC) · site-brede aggregaten, nooit per gebruiker
        {!o.available && " · ⚠ store onbereikbaar"}
      </p>

      <Section title="Kosten & gebruik (vandaag)">
        <Row label="Analyses vandaag" value={`${o.analysesToday} / ${o.budget}`} />
        <Row
          label="Geschatte kosten"
          value={`≈ € ${o.estCostEur.toFixed(2)}`}
          sub={`× € ${EUR_PER_ANALYSIS.toFixed(2)}/analyse — indicatief`}
        />
        <Row
          label="Budget resterend"
          value={`${o.remaining}`}
          sub={o.remaining === 0 ? "dagbudget bereikt → 429 tot middernacht UTC" : undefined}
        />
        <Row label="Unieke bezoekers (≈)" value={`${o.uniqueVisitors}`} sub="HyperLogLog-schatting" />
      </Section>

      <Section title="Stemmen (cumulatief)">
        <Row label="Totaal stemmen" value={`${o.votes.total}`} />
        <Row
          label="Correct"
          value={o.votes.percentage === null ? "te weinig data" : `${o.votes.percentage}%`}
        />
      </Section>

      <Section title="Fouten (cumulatief)">
        {Object.entries(o.errors).map(([k, v]) => (
          <Row key={k} label={k} value={`${v}`} />
        ))}
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "1.75rem" }}>
      <h2
        style={{
          fontSize: "0.8rem",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "#888",
          marginBottom: "0.5rem",
        }}
      >
        {title}
      </h2>
      <div style={{ border: "1px solid #e5e5e5", borderRadius: 10, overflow: "hidden" }}>{children}</div>
    </section>
  );
}

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: "1rem",
        padding: "0.6rem 0.9rem",
        borderTop: "1px solid #f0f0f0",
      }}
    >
      <span style={{ color: "#333" }}>
        {label}
        {sub && <span style={{ display: "block", fontSize: "0.75rem", color: "#999" }}>{sub}</span>}
      </span>
      <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{value}</span>
    </div>
  );
}

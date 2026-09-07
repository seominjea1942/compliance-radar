import { Badge } from "@/components/ui/badge";

type Row = { label: string; value: string };

function text(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return null;
}

/** "20260602" -> "2026-06-02". openFDA packs dates without separators. */
function fdaDate(v: unknown): string | null {
  const s = text(v);
  return s && /^\d{8}$/.test(s) ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : null;
}

/**
 * Source-specific provenance, built only from keys the payload actually has.
 *
 * Each artboard (recall / council / fee / permit) shows different facts, but
 * they are all the same shape: labelled values lifted from the record, plus
 * whatever link the source gave us. Nothing is inferred.
 */
export function Provenance({
  source,
  payload,
}: {
  source: string;
  payload: Record<string, unknown> | null;
}) {
  if (!payload) {
    return (
      <p className="m-0 text-[13px]/relaxed text-faint">
        The log view does not carry the source record, so there is nothing more to show here yet.
      </p>
    );
  }

  const rows: Row[] = [];
  const push = (label: string, v: string | null) => v && rows.push({ label, value: v });

  const product = (payload.product ?? {}) as Record<string, unknown>;
  const list = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && !!x.trim()) : [];

  if (source === "openfda_enforcement" || source === "fda_rss" || source === "fsis_email") {
    push("Product", text(product.product_name));
    push("Brand", text(product.brand));
    push("Size", list(product.sizes).join(" · ") || null);
    // Only verified complete UPCs are stored, so anything here is trustworthy.
    push("UPC", list(product.upcs).join(", ") || null);
    push("Container", list(product.containers).join(", ") || null);
    push("Lot / best by", text(payload.code_info));
    push("Quantity recalled", text(payload.product_quantity));
    push("Recalling firm", text(payload.recalling_firm));
    push("Class", text(payload.classification));
    push("Recall number", text(payload.recall_number));
    push("Initiated", fdaDate(payload.recall_initiation_date));
    push("Distribution", text(payload.distribution_pattern));
    push("Reason given", text(payload.reason_for_recall));
    push("Published", text(payload.published));
  }

  if (source === "legistar") {
    push("Meeting date", text(payload.meeting_date));
    push("Body", text(payload.meeting_body));
    push("Matter type", text(payload.matter_type));
    push("Agenda item", text(payload.agenda_number));
    push("On consent calendar", text(payload.on_consent_calendar));
  }

  if (source === "permits") {
    push("Address", text(payload.address));
    push("Work category", text(payload.work_category));
    push("Status", text(payload.status));
    push("Issued", text(payload.issue_date));
    push("Distance from store", text(payload.distance_from_store_m) ? `${Math.round(Number(payload.distance_from_store_m))} m` : null);
    push("Permit value", text(payload.permit_value));
    push("Square footage", text(payload.square_footage));
  }

  const link = text(payload.link) ?? text(payload.staff_report_attachment);

  const keyDates = Array.isArray(payload.key_dates)
    ? (payload.key_dates as Record<string, unknown>[])
        .map((d) => ({ label: text(d.label), date: text(d.date) }))
        .filter((d): d is { label: string; date: string } => !!d.label && !!d.date)
    : [];

  const evidence = payload.evidence as Record<string, unknown> | undefined;
  const quote = evidence ? text(evidence.quote) : null;
  const pageHint = evidence ? text(evidence.page_hint) : null;

  return (
    <div className="flex flex-col gap-4">
      {keyDates.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[10px] font-medium tracking-[0.14em] text-monoink uppercase">
            Dates that matter
          </span>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {keyDates.map((d) => (
              <li key={`${d.label}-${d.date}`} className="flex items-baseline gap-2 text-[13.5px]">
                <span className="flex-1 text-ink">{d.label}</span>
                <span className="font-mono text-[12.5px] text-faint">{d.date}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {quote && (
        <blockquote className="m-0 border-l-2 border-line-strong pl-3.5">
          <p className="m-0 text-[15px]/relaxed text-body">“{quote}”</p>
          {pageHint && <cite className="text-[11.5px] text-faint not-italic">{pageHint}</cite>}
        </blockquote>
      )}

      {rows.length > 0 && (
        <dl className="m-0 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-[auto_1fr]">
          {rows.map((r) => (
            <div key={r.label} className="contents">
              <dt className="text-[12.5px] text-faint sm:whitespace-nowrap">{r.label}</dt>
              <dd className="m-0 text-pretty text-[13.5px] text-ink">{r.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {source !== "legistar" && source !== "permits" && text(payload.title) && (
        <details className="group">
          <summary className="cursor-pointer text-[12.5px] font-medium text-green marker:content-none hover:underline">
            Show the full product description
          </summary>
          <p className="mt-2 mb-0 text-pretty text-[12.5px]/relaxed text-faint">
            {text(payload.title)}
          </p>
        </details>
      )}

      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[13px] font-medium text-green no-underline hover:underline"
        >
          Open the source record ↗
        </a>
      )}

      {rows.length === 0 && !quote && keyDates.length === 0 && (
        <Badge variant="bare">No further detail in the record</Badge>
      )}
    </div>
  );
}

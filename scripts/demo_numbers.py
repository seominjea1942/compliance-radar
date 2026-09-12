"""The single source of truth for every figure the demo script quotes.

Run on recording day, BEFORE the first take, and reconcile the narration:

    .venv/bin/python scripts/demo_numbers.py

Rule (after two review rounds each caught a different from-memory number):
if a figure cannot be produced by this script, it does not belong in the
narration. Read-only; touches nothing.
"""
import datetime
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))
from db import client as db

# Per-source payload fields that carry a source-world date (not our ingest
# time). Formats differ per source, so parsing happens here in Python.
DATE_FIELDS = {
    "openfda_enforcement": ["recall_initiation_date", "report_date"],
    "fda_rss": ["published"],
    "fsis_email": ["published", "received_at", "date"],
    "legistar": ["meeting_date", "agenda_date"],
    "street_work": ["issue_date", "start_date", "expiry_date"],
    "permits": ["issue_date"],
}


def parse_date(value):
    if not value:
        return None
    value = str(value).strip()
    try:  # RFC 822 (RSS pubDate, email Date headers)
        import email.utils
        dt = email.utils.parsedate_to_datetime(value)
        if dt:
            return dt.date()
    except (TypeError, ValueError):
        pass
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})", value) or re.match(r"(\d{4})(\d{2})(\d{2})$", value)
    if m:
        try:
            return datetime.date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        except ValueError:
            return None
    return None


def main():
    conn = db.connect()
    with conn.cursor() as c:
        print("== Totals (v_read_totals; the home strip) ==")
        c.execute("SELECT SUM(reviewed), SUM(surfaced), SUM(filtered) FROM v_read_totals")
        reviewed, surfaced, filtered = c.fetchone()
        print(f"  read {reviewed} | brought to you {surfaced} | set aside {filtered}")

        print("== Surfaced split by action_type (v_surfaced_feed; NULL renders as check) ==")
        c.execute("""SELECT COALESCE(action_type, 'NULL(check)'), COUNT(*)
                     FROM v_surfaced_feed GROUP BY action_type ORDER BY 2 DESC""")
        for at, n in c.fetchall():
            print(f"  {at}: {n}")

        print("== Open cards (resolution IS NULL) by action_type ==")
        c.execute("""SELECT COALESCE(action_type, 'NULL(check)'), COUNT(*)
                     FROM triage_decisions
                     WHERE decision IN ('ALERT','OPPORTUNITY') AND resolution IS NULL
                     GROUP BY action_type ORDER BY 2 DESC""")
        for at, n in c.fetchall():
            print(f"  {at}: {n}")
        c.execute("""SELECT COUNT(*) FROM triage_decisions
                     WHERE decision IN ('ALERT','OPPORTUNITY') AND resolution IS NOT NULL""")
        print(f"  handled: {c.fetchone()[0]}")

        print("== Runtime range (triage_decisions.created_at; the honest operating window) ==")
        c.execute("SELECT MIN(created_at), MAX(created_at) FROM triage_decisions")
        lo, hi = c.fetchone()
        print(f"  {lo} -> {hi}  ({(hi - lo).days} days of operation)")

        print("== Data range per source (source-world dates parsed from documents.payload) ==")
        for source, fields in DATE_FIELDS.items():
            c.execute("SELECT payload FROM documents WHERE source=%s", (source,))
            dates = []
            for (payload,) in c.fetchall():
                try:
                    p = json.loads(payload)
                except (TypeError, ValueError):
                    continue
                for f in fields:
                    d = parse_date(p.get(f))
                    if d:
                        dates.append(d)
                        break
            if dates:
                print(f"  {source}: {min(dates)} -> {max(dates)}  ({len(dates)} dated docs)")
            else:
                print(f"  {source}: no parseable dates")

        print("== Albertsons cluster ==")
        c.execute("""SELECT d.id, doc.payload FROM triage_decisions d
                     JOIN documents doc ON doc.id = d.document_id
                     WHERE doc.title LIKE %s OR d.reason LIKE %s""",
                  ("%Albertsons%", "%Albertsons%"))
        rows = c.fetchall()
        dates = set()
        for _, payload in rows:
            try:
                p = json.loads(payload)
            except (TypeError, ValueError):
                continue
            d = parse_date(p.get("report_date") or p.get("recall_initiation_date"))
            if d:
                dates.add(d)
        print(f"  rows: {len(rows)} | distinct source dates: {sorted(map(str, dates))}")

        print("== Fromm row position in the log's food-recalls filter (newest first) ==")
        c.execute("""SELECT decision_id, title FROM v_filtered_log
                     WHERE tags LIKE %s ORDER BY created_at DESC""", ('%food-recalls%',))
        log = c.fetchall()
        pos = next((i + 1 for i, (_, t) in enumerate(log) if "Fromm" in t), None)
        print(f"  row {pos} of {len(log)}" if pos else f"  Fromm NOT in the filtered log ({len(log)} rows)")

        print("== Store profile ==")
        c.execute("SELECT profile FROM store_profile WHERE id = 1")
        profile = json.loads(c.fetchone()[0])
        facts = profile.get("facts", [])
        entries = profile.get("carry_list", {}).get("entries", [])
        print(f"  facts: {len(facts)} | carry_list entries: {len(entries)}")
    conn.close()


if __name__ == "__main__":
    main()

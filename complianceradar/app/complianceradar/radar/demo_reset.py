"""Restore the demo baseline after visitors interact with the live app.

Runs daily at 6:30 AM PT (after the 6:00 triage run) via the same
EventBridge -> Lambda -> InvokeAgentRuntime path, payload
{"action": "demo_reset"}. It only undoes visitor interactions; it never
touches triage decisions, reasons, or timestamps.

Baseline:
- resolutions made on or before BASELINE_CUTOFF stay (the groomed set);
  anything resolved after it is reopened
- no overturns
- the packaged store profile (8 facts, 53 carry-list entries)
"""
import json
import pathlib

from radar import db

PROFILE_PATH = pathlib.Path(__file__).parent / "store_profile.json"
BASELINE_CUTOFF = "2026-09-11 00:00:00"  # UTC; groomed resolutions predate this


def reset() -> dict:
    baseline_profile = PROFILE_PATH.read_text()
    conn = db.connect()
    with conn.cursor() as c:
        c.execute("""UPDATE triage_decisions SET resolution=NULL, resolved_at=NULL
                     WHERE resolved_at >= %s""", (BASELINE_CUTOFF,))
        reopened = c.rowcount
        c.execute("""UPDATE triage_decisions
                     SET overturned=FALSE, overturned_at=NULL,
                         overturn_reason_type=NULL, overturn_note=NULL
                     WHERE overturned=TRUE""")
        overturns_reverted = c.rowcount
        c.execute("SELECT profile FROM store_profile WHERE id = 1")
        row = c.fetchone()
        profile_restored = row is None or json.loads(row[0]) != json.loads(baseline_profile)
        if profile_restored:
            c.execute("""INSERT INTO store_profile (id, profile) VALUES (1, %s)
                         ON DUPLICATE KEY UPDATE profile = VALUES(profile)""",
                      (baseline_profile,))
    conn.commit()
    conn.close()
    return {"reopened": reopened, "overturns_reverted": overturns_reverted,
            "profile_restored": profile_restored}

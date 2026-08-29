"""Source pipeline 2: San Jose city council agendas (Legistar Web API).

Validated 2026-08: client 'sanjose', no token. EventItemConsent is always 0;
consent status lives in EventItemMatterType ("Consent Agenda", "Land Use
Consent Agenda"). Events include future meetings, so filter by date explicitly.
"""
import datetime
import json
import urllib.parse
import urllib.request

BASE = "https://webapi.legistar.com/v1/sanjose"
UA = {"User-Agent": "compliance-radar/0.1 (hackathon; contact: seominjea1942@gmail.com)"}


def _get(url: str):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())


def fetch_items(days_back: int = 14, bodies: tuple = ("City Council",)) -> list[dict]:
    """EventItems with real titles from meetings in the window, normalized."""
    today = datetime.date.today()
    start = today - datetime.timedelta(days=days_back)
    flt = urllib.parse.quote(
        f"EventDate ge datetime'{start}' and EventDate lt datetime'{today + datetime.timedelta(days=1)}'")
    events = _get(f"{BASE}/Events?$filter={flt}&$orderby=EventDate%20desc&$top=50")
    items = []
    for ev in events:
        body = ev.get("EventBodyName") or ""
        if bodies and body not in bodies:
            continue
        for it in _get(f"{BASE}/Events/{ev['EventId']}/EventItems"):
            title = (it.get("EventItemTitle") or "").strip()
            if len(title) < 25 or not it.get("EventItemMatterId"):
                continue  # structural/boilerplate rows
            if any(b in title.lower() for b in (
                    "language access", "americans with disabilities", "ada coordinator",
                    "rules of conduct", "levine act", "wordly", "scroll to the end")):
                continue  # recurring procedural boilerplate that carries a MatterId
            mtype = it.get("EventItemMatterType") or ""
            items.append({
                "source": "legistar",
                "type": "council_agenda_item",
                "external_id": f"eventitem-{it['EventItemId']}",
                "title": title[:500],
                "matter_id": it.get("EventItemMatterId"),
                "matter_type": mtype,
                "on_consent_calendar": "consent" in mtype.lower(),
                "agenda_number": it.get("EventItemAgendaNumber"),
                "meeting_body": body,
                "meeting_date": (ev.get("EventDate") or "")[:10],
            })
    return items

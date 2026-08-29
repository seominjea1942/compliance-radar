"""Source pipeline 1: FDA recalls.

Two-channel design decided in validation (validation/REPORT.md):
- FDA press-release RSS = the fresh trigger (day-old items)
- openFDA enforcement API = structured enrichment (classification, distribution)

fetch_items() returns normalized items ready for triage. No store logic here;
the triage agent owns relevance.
"""
import datetime
import re
import urllib.request
import xml.etree.ElementTree as ET

RSS_URL = "https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/recalls/rss.xml"
OPENFDA_URL = (
    "https://api.fda.gov/food/enforcement.json"
    "?search=report_date:[{start}+TO+{end}]&limit=100"
)
UA = {"User-Agent": "compliance-radar/0.1 (hackathon; contact: seominjea1942@gmail.com)"}


def _get(url: str, timeout: int = 30) -> bytes:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def fetch_rss_items() -> list[dict]:
    """Fresh recall press releases (all FDA-regulated products, nationwide)."""
    root = ET.fromstring(_get(RSS_URL))
    items = []
    for it in root.iter("item"):
        get = lambda tag: (it.findtext(tag) or "").strip()
        items.append({
            "source": "fda_rss",
            "type": "food_recall_press_release",
            "title": get("title"),
            "description": re.sub(r"<[^>]+>", " ", get("description")).strip(),
            "link": get("link"),
            "published": get("pubDate"),
        })
    return items


def fetch_enforcement_items(days_back: int = 30) -> list[dict]:
    """Structured enforcement records recently added to the openFDA feed."""
    end = datetime.date.today()
    start = end - datetime.timedelta(days=days_back)
    url = OPENFDA_URL.format(start=start.strftime("%Y%m%d"), end=end.strftime("%Y%m%d"))
    import json
    data = json.loads(_get(url))
    items = []
    for rec in data.get("results", []):
        items.append({
            "source": "openfda_enforcement",
            "type": "food_recall_enforcement",
            "title": rec.get("product_description", "")[:200],
            "reason_for_recall": rec.get("reason_for_recall", ""),
            "classification": rec.get("classification", ""),
            "distribution_pattern": rec.get("distribution_pattern", ""),
            "recall_initiation_date": rec.get("recall_initiation_date", ""),
            "recalling_firm": rec.get("recalling_firm", ""),
            "recall_number": rec.get("recall_number", ""),
        })
    return items


def fetch_items() -> list[dict]:
    return fetch_rss_items() + fetch_enforcement_items()


if __name__ == "__main__":
    rss = fetch_rss_items()
    enf = fetch_enforcement_items()
    print(f"RSS items: {len(rss)}; newest: {rss[0]['published'] if rss else 'n/a'}")
    print(f"  e.g. {rss[0]['title'][:90] if rss else ''}")
    print(f"Enforcement items (last 30d by report_date): {len(enf)}")
    print(f"  e.g. {enf[0]['title'][:90] if enf else ''}")

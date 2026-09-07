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
IMG_RE = re.compile(r'<img[^>]+src="(/files/[^"]+\.(?:jpg|jpeg|png)[^"]*)"')


def fetch_recall_images(link: str, max_images: int = 4) -> tuple[list[str], list[str]]:
    """Official product photos from an FDA press-release page (best effort).
    Returns (thumbnail_urls, full_size_urls); full size derived by stripping
    the style path, unverified at ingest (FE hides on 404)."""
    try:
        html = _get(link, timeout=20).decode("utf-8", "replace")
        smalls = ["https://www.fda.gov" + m for m in IMG_RE.findall(html)[:max_images]]
        fulls = [re.sub(r"/files/styles/[^/]+/public/", "/files/", u).split("?")[0]
                 for u in smalls]
        return smalls, fulls
    except Exception:
        return [], []
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
            "event_key": get("link") or get("title")[:80],  # one press release = one event
            **(dict(zip(("images", "images_full"),
                        fetch_recall_images(get("link")))) if get("link")
               else {"images": [], "images_full": []}),
            "title": get("title"),
            "description": re.sub(r"<[^>]+>", " ", get("description")).strip(),
            "link": get("link"),
            "published": get("pubDate"),
        })
    return items


def fetch_enforcement_items(days_back: int = 30, max_pages: int = 1) -> list[dict]:
    """Structured enforcement records recently added to the openFDA feed.

    Paginates (100/page) up to max_pages; openFDA supports skip up to 25000.
    """
    import json
    end = datetime.date.today()
    start = end - datetime.timedelta(days=days_back)
    base = OPENFDA_URL.format(start=start.strftime("%Y%m%d"), end=end.strftime("%Y%m%d"))
    results = []
    for page in range(max_pages):
        data = json.loads(_get(base + f"&skip={page * 100}"))
        batch = data.get("results", [])
        results.extend(batch)
        if len(batch) < 100:
            break
    items = []
    for rec in results:
        firm = rec.get("recalling_firm", "")
        init = rec.get("recall_initiation_date", "")
        items.append({
            "source": "openfda_enforcement",
            "type": "food_recall_enforcement",
            # one real-world recall event spans many product rows; openFDA's
            # event_id groups them (fallback: firm+initiation date)
            "event_key": rec.get("event_id") or f"evt-{firm[:40]}-{init}".replace(" ", "_"),
            # full description: truncating here once cost us complete UPCs
            "title": rec.get("product_description", "")[:1800],
            "reason_for_recall": rec.get("reason_for_recall", ""),
            "classification": rec.get("classification", ""),
            "distribution_pattern": rec.get("distribution_pattern", ""),
            "recall_initiation_date": rec.get("recall_initiation_date", ""),
            "recalling_firm": rec.get("recalling_firm", ""),
            "recall_number": rec.get("recall_number", ""),
            "code_info": rec.get("code_info", "")[:1500],
            "product_quantity": rec.get("product_quantity", ""),
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

"""Source pipeline: street work near the store.

Answers the map card's real question ("is anything about to block my
sidewalk, street, or parking?") with datasets that actually say so.

Status semantics (verified against the data 2026-09-05, n=193 near-store
permits): 'Issued' = active/authorized work (23/23 not finaled);
'Accepted' = work COMPLETED and accepted by the city pending closeout
(85/85 finaled, 82/85 past expiry). Only Issued + unexpired + unfinaled
counts as active. EXPIRYDATE/FINALDATE are the honest activity signals.

Datasets:
- Utility street excavation permits (PLN_PermitsAndComplaints layer 16),
  active only, with FOLDERDESCRIPTION (real work description, names the
  utility) and expiry dates.
- DOT pavement projects, future (0) and current (1): wider box (~1.2km),
  since planned repaving deserves weeks of warning.
- DOT pavement moratorium segments (2): recently paved no-dig streets;
  ingested as deterministic context (no LLM triage), map-only.
"""
import datetime
import json
import urllib.parse
import urllib.request

from radar.permits import STORE_LAT, STORE_LON, distance_m

UA = {"User-Agent": "compliance-radar/0.1 (hackathon; contact: seominjea1942@gmail.com)"}
UTIL_URL = ("https://geo.sanjoseca.gov/server/rest/services/PLN/"
            "PLN_PermitsAndComplaints/MapServer/16/query")
PAVE_URL = ("https://geo.sanjoseca.gov/server/rest/services/DOT/"
            "DOT_PavementLayers/MapServer/{layer}/query")

# block-scale box for excavation (~600m); wider box for pavement/moratorium
BOX_TIGHT = {"xmin": STORE_LON - 0.007, "ymin": STORE_LAT - 0.0055,
             "xmax": STORE_LON + 0.007, "ymax": STORE_LAT + 0.0055,
             "spatialReference": {"wkid": 4326}}
BOX_WIDE = {"xmin": STORE_LON - 0.013, "ymin": STORE_LAT - 0.009,
            "xmax": STORE_LON + 0.013, "ymax": STORE_LAT + 0.009,
            "spatialReference": {"wkid": 4326}}
STORE_STREET = "lincoln"


def _query(url: str, where: str, box: dict) -> list[dict]:
    params = ("?geometry=" + urllib.parse.quote(json.dumps(box)) +
              "&geometryType=esriGeometryEnvelope&inSR=4326"
              "&spatialRel=esriSpatialRelIntersects"
              f"&where={urllib.parse.quote(where)}"
              "&outFields=*&f=geojson&resultRecordCount=300")
    req = urllib.request.Request(url + params, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read()).get("features", [])


def _midpoint(geom) -> tuple:
    coords = (geom or {}).get("coordinates") or []
    if coords and isinstance(coords[0][0], (list, tuple)):
        coords = [pt for part in coords for pt in part]
    if not coords:
        return None, None
    lon, lat = coords[len(coords) // 2]
    return lat, lon


def _ms_date(v):
    return (datetime.datetime.fromtimestamp(v / 1000).date().isoformat()
            if isinstance(v, (int, float)) and v else None)


def _base(f, kind: str, seg: str) -> dict:
    lat, lon = _midpoint(f.get("geometry"))
    return {
        "source": "street_work",
        "type": kind,
        "segment": seg,
        "lat": lat, "lon": lon,
        "on_store_street": STORE_STREET in (seg or "").lower(),
        "distance_from_store_m": (round(distance_m(STORE_LAT, STORE_LON, lat, lon))
                                  if lat else None),
    }


def fetch_items() -> list[dict]:
    """Active street work for triage (moratorium is fetched separately)."""
    items = []
    now_ms = datetime.datetime.now().timestamp() * 1000
    for f in _query(UTIL_URL, "STATUSDESC = 'Issued' AND FINALDATE IS NULL", BOX_TIGHT):
        a = f.get("properties", {})
        exp = a.get("EXPIRYDATE")
        if exp and exp < now_ms:
            continue  # permit lapsed; not active work
        loc = (a.get("PROPERTYLOCATION") or "").strip()
        desc = " ".join((a.get("FOLDERDESCRIPTION") or "").split())
        it = _base(f, "street_excavation_permit", loc)
        it.update({
            "external_id": f"util-{a.get('FACILITYID') or a.get('OBJECTID')}",
            "title": f"Street excavation permit ({a.get('WORKDESC')}/{a.get('SUBDESC')}) {loc}"[:300],
            "status": "Issued (active)",
            "work_description": desc[:500],
            "issue_date": _ms_date(a.get("ISSUEDATE")),
            "expiry_date": _ms_date(a.get("EXPIRYDATE")),
        })
        it["on_store_street"] = it["on_store_street"] or STORE_STREET in desc.lower()
        items.append(it)
    for layer, kind in ((0, "future"), (1, "current")):
        for f in _query(PAVE_URL.format(layer=layer), "1=1", BOX_WIDE):
            a = f.get("properties", {})
            seg = f"{a.get('STREETNAME')} from {a.get('STREETFROM')} to {a.get('STREETTO')}"
            it = _base(f, f"pavement_project_{kind}", seg)
            it.update({
                "external_id": f"pave{layer}-{a.get('FACILITYID') or a.get('OBJECTID')}",
                "title": f"Pavement project ({kind}): {seg}"[:300],
                "status": kind,
                "project_name": a.get("PROJECTNAME"),
                "project_year": a.get("PROJECTYEAR"),
            })
            items.append(it)
    return items


def fetch_moratorium() -> list[dict]:
    """No-dig (recently paved) segments: deterministic map context, no triage."""
    items = []
    for f in _query(PAVE_URL.format(layer=2), "1=1", BOX_WIDE):
        a = f.get("properties", {})
        seg = f"{a.get('STREETNAME')} from {a.get('STREETFROM')} to {a.get('STREETTO')}"
        it = _base(f, "pavement_moratorium", seg)
        it.update({
            "external_id": f"mora-{a.get('FACILITYID') or a.get('OBJECTID')}",
            "title": f"Pavement moratorium (recently paved, no-dig): {seg}"[:300],
            "status": "moratorium",
            "project_year": a.get("PROJECTYEAR"),
            "expiry_date": _ms_date(a.get("EXPIRATION")),
        })
        items.append(it)
    return items

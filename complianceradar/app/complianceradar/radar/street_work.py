"""Source pipeline: street work near the store.

Answers the map card's real question ("is anything about to block my
sidewalk, street, or parking?") with the datasets that actually say so:
- Utility street excavation permits (PLN_PermitsAndComplaints layer 16),
  live statuses only (Issued/Accepted); Closed Out/Expired/Cancelled are done.
- DOT pavement projects, future (layer 0) and current (layer 1): planned or
  active street resurfacing by street segment.
Building permits (radar/permits.py) remain background context only.
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

# ~600m box around the store (block-scale, per the product promise)
ENVELOPE = {"xmin": STORE_LON - 0.007, "ymin": STORE_LAT - 0.0055,
            "xmax": STORE_LON + 0.007, "ymax": STORE_LAT + 0.0055,
            "spatialReference": {"wkid": 4326}}
LIVE_UTILITY_STATUSES = ("Issued", "Accepted")


def _query(url: str, where: str) -> list[dict]:
    params = ("?geometry=" + urllib.parse.quote(json.dumps(ENVELOPE)) +
              "&geometryType=esriGeometryEnvelope&inSR=4326"
              "&spatialRel=esriSpatialRelIntersects"
              f"&where={urllib.parse.quote(where)}"
              "&outFields=*&f=geojson&resultRecordCount=200")
    req = urllib.request.Request(url + params, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read()).get("features", [])


def _midpoint(geom) -> tuple:
    coords = (geom or {}).get("coordinates") or []
    # LineString or MultiLineString; flatten to points
    if coords and isinstance(coords[0][0], (list, tuple)):
        coords = [pt for part in coords for pt in part]
    if not coords:
        return None, None
    lon, lat = coords[len(coords) // 2]
    return lat, lon


def _ms_date(v):
    return (datetime.datetime.fromtimestamp(v / 1000).date().isoformat()
            if isinstance(v, (int, float)) and v else None)


def fetch_items() -> list[dict]:
    items = []
    status_list = ", ".join(f"'{s}'" for s in LIVE_UTILITY_STATUSES)
    # live status AND recent issue: old 'Accepted' rows are stale applications
    cutoff = (datetime.date.today() - datetime.timedelta(days=400)).isoformat()
    for f in _query(UTIL_URL, f"STATUSDESC IN ({status_list}) AND ISSUEDATE >= DATE '{cutoff}'"):
        a = f.get("properties", {})
        lat, lon = _midpoint(f.get("geometry"))
        loc = (a.get("PROPERTYLOCATION") or "").strip()
        items.append({
            "source": "street_work",
            "type": "street_excavation_permit",
            "external_id": f"util-{a.get('FACILITYID') or a.get('OBJECTID')}",
            "title": f"Street excavation permit ({a.get('WORKDESC')}/{a.get('SUBDESC')}) {loc}"[:300],
            "status": a.get("STATUSDESC"),
            "segment": loc,
            "issue_date": _ms_date(a.get("ISSUEDATE")),
            "lat": lat, "lon": lon,
            "distance_from_store_m": (round(distance_m(STORE_LAT, STORE_LON, lat, lon))
                                      if lat else None),
        })
    for layer, kind in ((0, "future"), (1, "current")):
        for f in _query(PAVE_URL.format(layer=layer), "1=1"):
            a = f.get("properties", {})
            lat, lon = _midpoint(f.get("geometry"))
            seg = f"{a.get('STREETNAME')} from {a.get('STREETFROM')} to {a.get('STREETTO')}"
            items.append({
                "source": "street_work",
                "type": f"pavement_project_{kind}",
                "external_id": f"pave{layer}-{a.get('FACILITYID') or a.get('OBJECTID')}",
                "title": f"Pavement project ({kind}): {seg}"[:300],
                "status": kind,
                "segment": seg,
                "project_name": a.get("PROJECTNAME"),
                "project_year": a.get("PROJECTYEAR"),
                "lat": lat, "lon": lon,
                "distance_from_store_m": (round(distance_m(STORE_LAT, STORE_LON, lat, lon))
                                          if lat else None),
            })
    return items

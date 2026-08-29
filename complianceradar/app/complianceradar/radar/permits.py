"""Source pipeline 3: San Jose building permits.

Primary: ArcGIS PLN_PermitsAndComplaints layers (point geometry, validated
2026-08). Layer 8 = Active Building Permit reaches further back than the
30-day CKAN CSV, so it also serves backfill. Store location: Willow Glen.
"""
import datetime
import json
import math
import urllib.parse
import urllib.request

LAYER_URL = ("https://geo.sanjoseca.gov/server/rest/services/PLN/"
             "PLN_PermitsAndComplaints/MapServer/{layer}/query")
UA = {"User-Agent": "compliance-radar/0.1 (hackathon; contact: seominjea1942@gmail.com)"}

# Fictional store anchor: Lincoln Ave commercial strip, Willow Glen
STORE_LAT, STORE_LON = 37.3085, -121.8995

ACTIVE_LAYER = 8
RECENT_30D_LAYER = 7


def _query(layer: int, where: str, max_records: int = 2000) -> list[dict]:
    params = (f"?where={urllib.parse.quote(where)}&outFields=*&f=geojson"
              f"&resultRecordCount={max_records}")
    req = urllib.request.Request(LAYER_URL.format(layer=layer) + params, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read()).get("features", [])


def distance_m(lat1, lon1, lat2, lon2) -> float:
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    return 6371000 * 2 * math.asin(math.sqrt(a))


def fetch_items(days_back: int = 90, layer: int = ACTIVE_LAYER) -> list[dict]:
    # ArcGIS date fields need DATE syntax; epoch-ms comparisons silently match nothing
    start = (datetime.date.today() - datetime.timedelta(days=days_back)).isoformat()
    feats = _query(layer, f"ISSUEDATE >= DATE '{start}'")
    items = []
    for f in feats:
        geom = f.get("geometry") or {}
        coords = geom.get("coordinates") or [None, None]
        p = f.get("properties", {})
        lon, lat = coords[0], coords[1]
        dist = distance_m(STORE_LAT, STORE_LON, lat, lon) if lat and lon else None
        issue_ms = p.get("ISSUEDATE")
        items.append({
            "source": "permits",
            "type": "building_permit",
            "external_id": p.get("FOLDERNUM") or f"objectid-{p.get('OBJECTID')}",
            "title": f"{p.get('WORKDESC', 'Permit')}: {p.get('SUBDESC', '')} at {p.get('ADDRESS', '')}".strip(),
            "work_category": p.get("WORKDESC"),
            "sub_description": p.get("SUBDESC"),
            "address": p.get("ADDRESS"),
            "lat": lat, "lon": lon,
            "distance_from_store_m": round(dist) if dist is not None else None,
            "permit_value": p.get("PERMITVALUE"),
            "square_footage": p.get("SQUAREFOOT"),
            "issue_date": (datetime.datetime.fromtimestamp(issue_ms / 1000).date().isoformat()
                           if issue_ms else None),
            "status": p.get("PERMITAPPROVAL"),
        })
    return items


def nearby(items: list[dict], radius_m: int = 800) -> list[dict]:
    return [i for i in items
            if i.get("distance_from_store_m") is not None
            and i["distance_from_store_m"] <= radius_m]


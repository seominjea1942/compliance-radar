"""Local CLI for the daily triage pass.

Thin wrapper around the authoritative pipeline in
complianceradar/app/complianceradar/radar/ (the deployed runtime code),
so local runs and cloud runs execute identical logic.

Usage: run_daily.py [--limit N]
Requires TIDB_* env vars (source .env.local) or python-dotenv fallback below.
"""
import argparse
import os
import pathlib
import sys

ROOT = pathlib.Path(__file__).parent.parent
APP = ROOT / "complianceradar" / "app" / "complianceradar"
sys.path.insert(0, str(APP))

# load .env.local into os.environ for the runtime db module
from dotenv import dotenv_values  # noqa: E402
for k, v in dotenv_values(ROOT / ".env.local").items():
    os.environ.setdefault(k, (v or "").strip('"'))

from radar.pipeline import run  # noqa: E402

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=None)
    summary = run(ap.parse_args().limit)
    print(summary)

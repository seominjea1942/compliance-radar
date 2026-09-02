"""Source pipeline: FSIS recall emails (GovDelivery -> SES -> S3).

The FSIS recall API is bot-blocked (validation 2026-08), so the official
GovDelivery subscription is the channel: emails land in S3 and this module
turns each bulletin into one normalized item for triage. The triage LLM does
the structuring the blocked API would have provided.
"""
import email
import html
import os
import re
from email import policy

import boto3

BUCKET = os.environ.get("INBOUND_EMAIL_BUCKET", "compliance-radar-inbound-emails-513189074111")
PREFIX = "fsis/"
SKIP_SUBJECTS = ("subscription change confirmation", "welcome new user")

_s3 = None


def _client():
    global _s3
    if _s3 is None:
        _s3 = boto3.client("s3", region_name="us-west-2")
    return _s3


def _body_text(msg) -> str:
    body = ""
    for part in msg.walk():
        if part.get_content_type() in ("text/plain", "text/html"):
            try:
                body = part.get_content()
            except Exception:
                continue
            if body:
                break
    text = re.sub(r"<[^>]+>", " ", body)
    return html.unescape(re.sub(r"\s+", " ", text)).strip()


def fetch_items(max_emails: int = 50) -> list[dict]:
    s3 = _client()
    resp = s3.list_objects_v2(Bucket=BUCKET, Prefix=PREFIX, MaxKeys=max_emails)
    items = []
    for obj in resp.get("Contents", []):
        key = obj["Key"]
        if key.endswith("AMAZON_SES_SETUP_NOTIFICATION"):
            continue
        raw = s3.get_object(Bucket=BUCKET, Key=key)["Body"].read()
        msg = email.message_from_bytes(raw, policy=policy.default)
        subject = (msg["Subject"] or "").strip()
        if not subject or any(s in subject.lower() for s in SKIP_SUBJECTS):
            continue
        text = _body_text(msg)
        # strip GovDelivery footer boilerplate
        text = re.split(r"Stay Connected|Subscriber Services", text)[0].strip()
        links = re.findall(r"https?://[^\s\]\[]+", text)
        bulletin = next((l for l in links if "govdelivery.com" in l and "bulletins" in l), "")
        items.append({
            "source": "fsis_email",
            "type": "meat_poultry_recall_bulletin",
            "external_id": key.split("/")[-1],
            "title": subject[:400],
            "description": text[:4000],
            "link": bulletin,
            "published": msg["Date"],
        })
    return items

"""Run separately: python -m jobs.worker [--once]. No migration or seeding."""

import argparse
import logging
import time

from sqlalchemy import select, update

from crm.schema_v5 import jobs
from integrations.instagram.client import ProviderError

from .queue import claim, finish

log = logging.getLogger("najmuni.jobs")

SAFE_PROVIDER_ERRORS = {
    "provider_timeout": "Instagram timed out; the synchronization will retry safely",
    "provider_network": "Instagram connection was interrupted; the synchronization will retry safely",
    "provider_unavailable": "Instagram is temporarily unavailable; the synchronization will retry safely",
    "provider_rate_limit": "Instagram rate limit reached; the synchronization will retry safely",
    "provider_authentication": "Instagram authorization expired; reconnect the account",
    "provider_permission": "Instagram permission was denied; review the approved permissions",
    "provider_bad_request": "Instagram rejected a history request",
    "provider_response": "Instagram returned an unexpected history response",
    "sync_safety": "Instagram synchronization stopped at a safety limit",
    "identity_conflict": "Instagram synchronization found a conflicting conversation identity",
    "lease_lost": "Instagram synchronization lease expired and will retry safely",
}


def _update_payload(engine, job, **values):
    with engine.begin() as conn:
        payload = conn.execute(
            select(jobs.c.payload).where(
                jobs.c.id == job["id"], jobs.c.lease_token == job["lease_token"]
            )
        ).scalar_one_or_none()
        if payload is not None:
            conn.execute(
                update(jobs)
                .where(
                    jobs.c.id == job["id"],
                    jobs.c.lease_token == job["lease_token"],
                )
                .values(payload={**payload, **values})
            )


def _update_progress_state(engine, job, state):
    with engine.begin() as conn:
        payload = conn.execute(
            select(jobs.c.payload).where(
                jobs.c.id == job["id"], jobs.c.lease_token == job["lease_token"]
            )
        ).scalar_one_or_none()
        if payload is not None:
            progress = {**(payload.get("progress") or {}), "state": state}
            conn.execute(
                update(jobs)
                .where(
                    jobs.c.id == job["id"],
                    jobs.c.lease_token == job["lease_token"],
                )
                .values(payload={**payload, "progress": progress})
            )


def run_once(engine):
    job = claim(engine)
    if not job:
        return False
    try:
        if job["kind"] == "instagram_ingest":
            from integrations.instagram.ingest import process_event

            process_event(engine, job["payload"]["event_id"])
        elif job["kind"] == "send_message":
            from crm.messaging import deliver

            deliver(
                engine,
                job["payload"]["message_id"],
                job["payload"].get("close_after_send", False),
            )
        elif job["kind"] == "ai_suggestion":
            from crm.ai import generate

            generate(engine, job["payload"]["suggestion_id"])
        elif job["kind"] == "instagram_sync":
            from integrations.instagram.sync import sync_account

            result = sync_account(engine, job["payload"]["account_id"], job=job)
            _update_payload(engine, job, result=result)
        else:
            raise ValueError("Unknown job kind")
        finish(engine, job)
    except Exception as error:
        # Provider exceptions and SQL errors may carry credentials or PII.
        # Operational UI receives safe categories, never exception strings.
        log.warning(
            "Job failed: id=%s kind=%s attempt=%s error_type=%s",
            job["id"],
            job["kind"],
            job["attempts"],
            type(error).__name__,
        )
        safe_error = "Processing failed; review configuration and retry"
        if isinstance(error, ProviderError):
            safe_error = SAFE_PROVIDER_ERRORS.get(error.code, safe_error)
        _update_progress_state(
            engine, job, "FAILED" if job["attempts"] >= 5 else "RETRYING"
        )
        finish(engine, job, safe_error)
    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true")
    args = parser.parse_args()
    from app import DATABASE_ENGINE, app

    logging.basicConfig(level=logging.INFO)
    with app.app_context():
        while True:
            busy = run_once(DATABASE_ENGINE)
            if args.once:
                return
            if not busy:
                time.sleep(1)


if __name__ == "__main__":
    main()

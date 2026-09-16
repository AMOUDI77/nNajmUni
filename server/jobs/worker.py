"""Run separately: python -m jobs.worker [--once]. No migration or seeding."""

import argparse
import logging
import time

from .queue import claim, finish

log = logging.getLogger("najmuni.jobs")


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
        else:
            raise ValueError("Unknown job kind")
        finish(engine, job)
    except Exception:
        # Provider exceptions and SQL errors may carry credentials or PII.
        # Operational UI receives safe categories, never exception strings.
        log.warning(
            "Job failed: id=%s kind=%s attempt=%s",
            job["id"],
            job["kind"],
            job["attempts"],
        )
        finish(engine, job, "Processing failed; review configuration and retry")
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

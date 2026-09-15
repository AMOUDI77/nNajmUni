"""Disposable local browser fixture. Never used by Gunicorn or Render."""

import os
import sys
import tempfile
import threading
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
if os.environ.get("RENDER"):
    raise SystemExit("Browser fixture is forbidden on Render")
fixture_dir = tempfile.TemporaryDirectory(prefix="najmuni-e2e-")
os.environ.update(
    DATABASE_URL="",
    DB_PATH=str(Path(fixture_dir.name) / "crm-demo.db"),
    CRM_ENV="development",
    META_PROVIDER_MODE="mock",
    META_APP_SECRET="e2e-signature-fixture",
    ANTHROPIC_API_KEY="",
    ADMIN_KEY="",
    STUDENT_KEY="",
    CRM_ALLOWED_ORIGINS="http://127.0.0.1:5088",
)
from app import app, DATABASE_ENGINE
from crm.schema_v1 import metadata
from crm.demo import seed_demo
from jobs.worker import run_once
import crm.ai


def fixture_ai(context):
    inbound = next(
        (m for m in context["recent_messages"] if m["direction"] == "INBOUND"), None
    )
    facts = (
        [
            {
                "field": "preferred_language",
                "value": "ar",
                "confidence": 0.95,
                "source_message_id": inbound["id"],
            }
        ]
        if inbound
        else []
    )
    return (
        {
            "reply": "أهلاً بك! ما المرحلة الدراسية التي ترغب بها؟",
            "summary": "Student asks about studying in Malaysia.",
            "facts": facts,
        },
        100,
        50,
    )


crm.ai.call_claude = fixture_ai

metadata.create_all(DATABASE_ENGINE)
seed_demo(DATABASE_ENGINE, "local-browser-test-only")
app.config["TESTING"] = True


def worker():
    with app.app_context():
        while True:
            run_once(DATABASE_ENGINE)
            time.sleep(0.2)


threading.Thread(target=worker, daemon=True).start()
app.run(host="127.0.0.1", port=5088, debug=False, use_reloader=False)

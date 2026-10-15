"""Isolated catalog/lead preview. No production credentials or outbound notifications."""
import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
if os.environ.get('RENDER'):
    raise SystemExit('Local preview only')
fixture = tempfile.TemporaryDirectory(prefix='najmuni-public-')
os.environ.update(DATABASE_URL='', DB_PATH=str(Path(fixture.name) / 'preview.db'),
                  ADMIN_KEY='preview-local-only', STUDENT_KEY='', SMTP_HOST='',
                  SMTP_USER='', SMTP_PASS='', NOTIFY_EMAIL_TO='', ANTHROPIC_API_KEY='',
                  CRM_ENV='development', META_PROVIDER_MODE='mock')
from app import app, DATABASE_ENGINE, get_db, seed, seed_institutes
from db.schema import metadata

metadata.create_all(DATABASE_ENGINE)
with app.app_context():
    db = get_db()
    seed(db)
    seed_institutes(db)
    db.commit()
app.run(host='127.0.0.1', port=5092, use_reloader=False)

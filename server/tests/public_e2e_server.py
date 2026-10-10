"""Disposable public-journey QA database; never connects to production services."""
import os
import sys
import tempfile
from pathlib import Path

if os.environ.get('RENDER'):
    raise SystemExit('Local fixture only')
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
fixture = tempfile.TemporaryDirectory(prefix='najmuni-public-qa-')
os.environ.update(DATABASE_URL='', DB_PATH=str(Path(fixture.name) / 'public.db'),
                  ADMIN_KEY='public-qa-local', STUDENT_KEY='', SMTP_HOST='',
                  SMTP_USER='', SMTP_PASS='', NOTIFY_EMAIL_TO='', ANTHROPIC_API_KEY='',
                  ALLOWED_ORIGINS='http://127.0.0.1:5173', CRM_ENV='development',
                  META_PROVIDER_MODE='mock')
from app import app, DATABASE_ENGINE, get_db, seed, seed_institutes
from db.schema import metadata

metadata.create_all(DATABASE_ENGINE)
with app.app_context():
    db = get_db()
    seed(db)
    seed_institutes(db)
    db.commit()
app.config['TESTING'] = True
app.run(host='127.0.0.1', port=int(os.environ.get('NAJMUNI_QA_PORT', '5091')), use_reloader=False)

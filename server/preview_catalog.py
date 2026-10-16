"""Local-only catalogue preview with an isolated database and no outbound messaging."""
import os
from pathlib import Path

if os.environ.get('RENDER'):
    raise SystemExit('Local preview only')
root = Path(__file__).resolve().parents[1]
os.environ.update(DATABASE_URL='', DB_PATH=str(root / '.run-logs' / 'catalog-preview.db'),
                  SMTP_HOST='', SMTP_USER='', SMTP_PASS='', NOTIFY_EMAIL_TO='',
                  META_PROVIDER_MODE='mock', ANTHROPIC_API_KEY='', CRM_ENV='development')
from app import app, DATABASE_ENGINE, seed_institutes
from crm.schema_v5 import metadata
from db.engine import DatabaseConnection
from partner_catalog import import_catalog

metadata.create_all(DATABASE_ENGINE)
db = DatabaseConnection(DATABASE_ENGINE)
try:
    added = import_catalog(db)
    seed_institutes(db)
    db.commit()
    print(f'Local preview: {added} programs imported; database isolated in .run-logs.')
finally:
    db.close()
app.run(host='127.0.0.1', port=5000, debug=False, use_reloader=False)

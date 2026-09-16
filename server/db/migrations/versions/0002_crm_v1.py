"""Add CRM domain; existing NajmUni business tables remain untouched."""

from alembic import op
from crm.schema_v1 import CRM_TABLES

revision = "0002_crm_v1"
down_revision = "0001_baseline"
branch_labels = None
depends_on = None


def upgrade():
    for table in CRM_TABLES:
        table.create(op.get_bind(), checkfirst=False)


def downgrade():
    for table in reversed(CRM_TABLES):
        table.drop(op.get_bind(), checkfirst=False)

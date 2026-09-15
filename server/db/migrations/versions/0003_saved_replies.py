"""Add simple staff-managed saved replies."""

from alembic import op
from crm.schema_v2 import saved_replies

revision = "0003_saved_replies"
down_revision = "0002_crm_v1"
branch_labels = None
depends_on = None


def upgrade():
    saved_replies.create(op.get_bind(), checkfirst=False)


def downgrade():
    saved_replies.drop(op.get_bind(), checkfirst=False)

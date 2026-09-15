"""Frozen baseline for the six existing NajmUni tables."""
from alembic import op
import sqlalchemy as sa

revision = '0001_baseline'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('universities',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('abbr', sa.Text()), sa.Column('name', sa.Text()),
        sa.Column('type', sa.Text()), sa.Column('location', sa.Text()),
        sa.Column('qs_ranking', sa.Integer()),
        sa.Column('color', sa.Text(), server_default='#6D28D9'),
        sa.Column('description', sa.Text()), sa.Column('website', sa.Text()),
        sa.Column('domain', sa.Text()), sa.Column('tuition_min', sa.Integer()),
        sa.Column('tuition_max', sa.Integer()), sa.Column('established', sa.Integer()),
        sa.Column('students_count', sa.Integer()))
    op.create_index('idx_unis_type', 'universities', ['type'])

    op.create_table('programs',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('university_id', sa.Integer(), sa.ForeignKey('universities.id')),
        sa.Column('name', sa.Text()), sa.Column('level', sa.Text()),
        sa.Column('duration_years', sa.Float()),
        sa.Column('tuition_per_year', sa.Integer()), sa.Column('field', sa.Text()),
        sa.Column('description', sa.Text()), sa.Column('intake', sa.Text()))
    op.create_index('idx_programs_uni', 'programs', ['university_id'])
    op.create_index('idx_programs_field', 'programs', ['field'])

    op.create_table('institutes',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('abbr', sa.Text()), sa.Column('name', sa.Text()),
        sa.Column('type', sa.Text(), server_default='language'),
        sa.Column('location', sa.Text()),
        sa.Column('color', sa.Text(), server_default='#4F6BFF'),
        sa.Column('description', sa.Text()), sa.Column('website', sa.Text()),
        sa.Column('domain', sa.Text()),
        sa.Column('tuition_min', sa.Integer(), server_default='0'),
        sa.Column('tuition_max', sa.Integer(), server_default='0'),
        sa.Column('established', sa.Integer()),
        sa.Column('students_count', sa.Integer(), server_default='0'))
    op.create_index('idx_institutes_type', 'institutes', ['type'])

    op.create_table('leads',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('email', sa.Text()), sa.Column('phone', sa.Text()),
        sa.Column('name', sa.Text()),
        sa.Column('source', sa.Text(), server_default='landing'),
        sa.Column('status', sa.Text(), server_default='new'),
        *[sa.Column(name, sa.Text(), server_default='') for name in
          ('nationality', 'study_level', 'specialization', 'qualification', 'grade',
           'english_level', 'preferred_start', 'passport_ready', 'financial_readiness',
           'preferred_university')],
        sa.Column('score', sa.Integer(), server_default='0'),
        sa.Column('priority', sa.Text(), server_default='low'),
        sa.Column('category', sa.Text(), server_default='inquiry'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP')))
    for index, field in (('idx_leads_email', 'email'), ('idx_leads_phone', 'phone'),
                         ('idx_leads_status', 'status'), ('idx_leads_created', 'created_at')):
        op.create_index(index, 'leads', [field])

    op.create_table('reservations',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('email', sa.Text(), nullable=False),
        sa.Column('phone', sa.Text(), nullable=False),
        *[sa.Column(name, sa.Text(), server_default='') for name in
          ('university', 'field', 'preferred_date', 'notes')],
        sa.Column('status', sa.Text(), server_default='new'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP')))
    op.create_index('idx_res_status', 'reservations', ['status'])
    op.create_index('idx_res_created', 'reservations', ['created_at'])

    op.create_table('students',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('full_name', sa.Text(), nullable=False),
        *[sa.Column(name, sa.Text(), server_default='') for name in
          ('email', 'phone', 'nationality', 'field', 'university', 'notes')],
        sa.Column('status', sa.Text(), server_default='new'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP')))
    op.create_index('idx_students_status', 'students', ['status'])
    op.create_index('idx_students_created', 'students', ['created_at'])


def downgrade():
    raise RuntimeError('Baseline downgrade would delete business data; restore from backup instead')

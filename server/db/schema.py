"""Existing six-table schema, expressed with SQLAlchemy Core metadata."""
from sqlalchemy import (MetaData, Table, Column, Integer, String, Text, Float,
                        DateTime, ForeignKey, Index, text)

metadata = MetaData()
now = text('CURRENT_TIMESTAMP')

universities = Table('universities', metadata,
    Column('id', Integer, primary_key=True), Column('abbr', Text), Column('name', Text),
    Column('type', Text), Column('location', Text), Column('qs_ranking', Integer),
    Column('color', Text, server_default=text("'#6D28D9'")), Column('description', Text),
    Column('website', Text), Column('domain', Text), Column('tuition_min', Integer),
    Column('tuition_max', Integer), Column('established', Integer), Column('students_count', Integer))

programs = Table('programs', metadata,
    Column('id', Integer, primary_key=True),
    Column('university_id', Integer, ForeignKey('universities.id'), nullable=True),
    Column('name', Text), Column('level', Text), Column('duration_years', Float),
    Column('tuition_per_year', Integer), Column('field', Text),
    Column('description', Text), Column('intake', Text))

institutes = Table('institutes', metadata,
    Column('id', Integer, primary_key=True), Column('abbr', Text), Column('name', Text),
    Column('type', Text, server_default=text("'language'")), Column('location', Text),
    Column('color', Text, server_default=text("'#4F6BFF'")), Column('description', Text),
    Column('website', Text), Column('domain', Text),
    Column('tuition_min', Integer, server_default=text('0')),
    Column('tuition_max', Integer, server_default=text('0')),
    Column('established', Integer), Column('students_count', Integer, server_default=text('0')))

leads = Table('leads', metadata,
    Column('id', Integer, primary_key=True), Column('email', Text), Column('phone', Text),
    Column('name', Text), Column('source', Text, server_default=text("'landing'")),
    Column('status', Text, server_default=text("'new'")),
    *[Column(name, Text, server_default=text("''")) for name in
      ('nationality', 'study_level', 'specialization', 'qualification', 'grade',
       'english_level', 'preferred_start', 'passport_ready', 'financial_readiness',
       'preferred_university')],
    Column('score', Integer, server_default=text('0')),
    Column('priority', Text, server_default=text("'low'")),
    Column('category', Text, server_default=text("'inquiry'")),
    Column('created_at', DateTime, server_default=now))

reservations = Table('reservations', metadata,
    Column('id', Integer, primary_key=True), Column('name', Text, nullable=False),
    Column('email', Text, nullable=False), Column('phone', Text, nullable=False),
    Column('university', Text, server_default=text("''")),
    Column('field', Text, server_default=text("''")),
    Column('preferred_date', Text, server_default=text("''")),
    Column('notes', Text, server_default=text("''")),
    Column('status', Text, server_default=text("'new'")),
    Column('created_at', DateTime, server_default=now))

students = Table('students', metadata,
    Column('id', Integer, primary_key=True), Column('full_name', Text, nullable=False),
    *[Column(name, Text, server_default=text("''")) for name in
      ('email', 'phone', 'nationality', 'field', 'university', 'notes')],
    Column('status', Text, server_default=text("'new'")),
    Column('created_at', DateTime, server_default=now),
    Column('updated_at', DateTime, server_default=now))

for name, table, field in (
    ('idx_leads_email', leads, 'email'), ('idx_leads_phone', leads, 'phone'),
    ('idx_leads_status', leads, 'status'), ('idx_leads_created', leads, 'created_at'),
    ('idx_res_status', reservations, 'status'), ('idx_res_created', reservations, 'created_at'),
    ('idx_students_status', students, 'status'), ('idx_students_created', students, 'created_at'),
    ('idx_programs_uni', programs, 'university_id'), ('idx_programs_field', programs, 'field'),
    ('idx_unis_type', universities, 'type'), ('idx_institutes_type', institutes, 'type')):
    Index(name, table.c[field])

TABLE_BY_NAME = {table.name: table for table in metadata.sorted_tables}

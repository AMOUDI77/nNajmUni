"""Small SQLAlchemy Core bridge for the existing parameterized Flask queries."""
import os
import re
from datetime import datetime

from sqlalchemy import create_engine


TABLES = ('universities', 'institutes', 'programs', 'leads', 'reservations', 'students')


def database_url(default_sqlite_path):
    url = os.environ.get('DATABASE_URL', '').strip()
    if url:
        if url.startswith('postgres://'):
            url = 'postgresql://' + url[len('postgres://'):]
        if url.startswith('postgresql://'):
            url = 'postgresql+psycopg://' + url[len('postgresql://'):]
        if not url.startswith('postgresql+psycopg://'):
            raise ValueError('DATABASE_URL must be a PostgreSQL URL')
        return url
    path = os.environ.get('DB_PATH', default_sqlite_path)
    if not os.path.isabs(path):
        server_dir = os.path.join(os.path.dirname(os.path.dirname(default_sqlite_path)), 'server')
        path = os.path.abspath(os.path.join(server_dir, path))
    return 'sqlite:///' + path.replace('\\', '/')


def make_engine(default_sqlite_path):
    url = database_url(default_sqlite_path)
    if url.startswith('sqlite:'):
        os.makedirs(os.path.dirname(url[len('sqlite:///'):]), exist_ok=True)
    return create_engine(url, pool_pre_ping=True, hide_parameters=True)


class DBRow(dict):
    def __init__(self, row):
        values = [value.strftime('%Y-%m-%d %H:%M:%S') if isinstance(value, datetime)
                  else value for value in row]
        super().__init__(zip(row._mapping.keys(), values))
        self._values = tuple(values)

    def __getitem__(self, key):
        if isinstance(key, int):
            return self._values[key]
        return super().__getitem__(key)


class DBCursor:
    def __init__(self, result, lastrowid=None):
        self.result = result
        self.lastrowid = lastrowid

    def fetchone(self):
        row = self.result.fetchone()
        return DBRow(row) if row is not None else None

    def fetchall(self):
        return [DBRow(row) for row in self.result.fetchall()]

    def __iter__(self):
        for row in self.result:
            yield DBRow(row)


class DatabaseConnection:
    def __init__(self, engine):
        self.connection = engine.connect()
        self.postgres = engine.dialect.name == 'postgresql'

    def execute(self, sql, params=()):
        # Existing application statements use DB-API positional placeholders.
        # SQL is assembled only from fixed query fragments/allowlisted column names.
        if self.postgres:
            sql = sql.replace('?', '%s')
            sql = re.sub(r'\bLIKE\b', 'ILIKE', sql, flags=re.I)
            sql = re.sub(r"datetime\('now'\)", 'CURRENT_TIMESTAMP', sql, flags=re.I)
            sql = re.sub(r"date\('now'\)", 'CURRENT_DATE', sql, flags=re.I)
            sql = re.sub(r'date\(created_at\)', 'CAST(created_at AS DATE)', sql, flags=re.I)
            if re.match(r'^\s*INSERT\s+INTO\s+', sql, re.I) and ' RETURNING ' not in sql.upper():
                result = self.connection.exec_driver_sql(sql + ' RETURNING id', tuple(params))
                inserted = result.scalar_one()
                return DBCursor(None, inserted)
        result = self.connection.exec_driver_sql(sql, tuple(params))
        return DBCursor(result, getattr(result, 'lastrowid', None))

    def commit(self):
        self.connection.commit()

    def close(self):
        if self.connection.in_transaction():
            self.connection.rollback()
        self.connection.close()

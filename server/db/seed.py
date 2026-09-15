"""Explicit sample/catalog seed. Never run automatically at Flask import."""
import argparse
from db.engine import DatabaseConnection


def seed_catalog(engine):
    # Import after engine initialization; importing app only registers routes.
    from app import UNIVERSITIES, PROGRAMS, INSTITUTES, seed, seed_institutes
    db = DatabaseConnection(engine)
    try:
        if db.execute('SELECT COUNT(*) FROM universities').fetchone()[0] == 0:
            seed(db)
        if db.execute('SELECT COUNT(*) FROM institutes').fetchone()[0] == 0:
            seed_institutes(db)
        db.commit()
    finally:
        db.close()


if __name__ == '__main__':
    from app import DATABASE_ENGINE
    parser = argparse.ArgumentParser(description='Seed an empty NajmUni catalog after Alembic upgrade')
    parser.add_argument('--yes', action='store_true', help='Explicitly allow catalog seeding')
    args = parser.parse_args()
    if not args.yes:
        parser.error('Pass --yes to seed empty catalog tables')
    seed_catalog(DATABASE_ENGINE)

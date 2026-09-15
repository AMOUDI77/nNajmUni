from sqlalchemy import create_engine, select

from db.schema import metadata, TABLE_BY_NAME
from db.seed import seed_catalog


def test_explicit_seed_does_not_overwrite_edited_institute(tmp_path):
    engine = create_engine('sqlite:///' + str(tmp_path / 'seed.db').replace('\\', '/'))
    metadata.create_all(engine)
    seed_catalog(engine)
    with engine.begin() as conn:
        row = conn.execute(select(TABLE_BY_NAME['institutes'].c.id).limit(1)).first()
        assert row is not None
        iid = row[0]
        conn.execute(TABLE_BY_NAME['institutes'].update().where(
            TABLE_BY_NAME['institutes'].c.id == iid).values(name='Counselor edited'))
    seed_catalog(engine)
    with engine.connect() as conn:
        name = conn.execute(select(TABLE_BY_NAME['institutes'].c.name).where(
            TABLE_BY_NAME['institutes'].c.id == iid)).scalar_one()
        assert name == 'Counselor edited'
    engine.dispose()

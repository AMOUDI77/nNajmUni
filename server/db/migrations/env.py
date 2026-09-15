import os
from alembic import context
from sqlalchemy import engine_from_config, pool
from db.engine import database_url
from db.schema import metadata

config = context.config
default_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'data', 'najmuni.db'))
url = database_url(default_path)
config.set_main_option('sqlalchemy.url', url.replace('%', '%%'))

if context.is_offline_mode():
    context.configure(url=url, target_metadata=metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()
else:
    engine = engine_from_config(config.get_section(config.config_ini_section),
                                prefix='sqlalchemy.', poolclass=pool.NullPool)
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=metadata)
        with context.begin_transaction():
            context.run_migrations()
    engine.dispose()

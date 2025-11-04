# alembic/env.py
import os, sys
from alembic import context
from sqlalchemy import engine_from_config, pool
from logging.config import fileConfig

# 1) Asegura que <project_root> esté en sys.path
# este archivo vive en <project_root>/alembic/env.py
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# 2) Imports absolutos desde app/
from app.settings import settings
from app.models import Base          # <-- en tu repo Base está en models.py
import app.models                    # <-- importante: registra todas las tablas

config = context.config
if config.config_file_name:
    fileConfig(config.config_file_name)

# Lee la URL desde settings (db_url o database_url)
db_url = getattr(settings, "db_url", None) or getattr(settings, "database_url", None)
if not db_url:
    raise RuntimeError("DB URL no configurada (define settings.db_url o settings.database_url)")
config.set_main_option("sqlalchemy.url", db_url)

target_metadata = Base.metadata

def run_migrations_offline():
    context.configure(url=db_url, target_metadata=target_metadata, literal_binds=True, compare_type=True)
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    connectable = engine_from_config(config.get_section(config.config_ini_section), prefix="sqlalchemy.", poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

"""create measurements table

Revision ID: 20251103_0001
Revises:
Create Date: 2025-11-03 00:00:00
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20251103_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "measurements",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("device_id", sa.String(length=64), nullable=False),
        sa.Column("ts", sa.DateTime(timezone=True), nullable=False),

        sa.Column("temp_piel_c", sa.Float(), nullable=True),
        sa.Column("temp_aire_c", sa.Float(), nullable=True),
        sa.Column("humedad", sa.Float(), nullable=True),
        sa.Column("luz", sa.Float(), nullable=True),
        sa.Column("ntc_c", sa.Float(), nullable=True),
        sa.Column("ntc_raw", sa.Integer(), nullable=True),
        sa.Column("peso_g", sa.Float(), nullable=True),

        sa.Column("set_control", sa.Integer(), nullable=True),
        sa.Column("alerts", sa.Integer(), nullable=True),
    )
    op.create_index("ix_measurements_device_id", "measurements", ["device_id"])
    op.create_index("ix_measurements_ts", "measurements", ["ts"])


def downgrade():
    op.drop_index("ix_measurements_ts", table_name="measurements")
    op.drop_index("ix_measurements_device_id", table_name="measurements")
    op.drop_table("measurements")

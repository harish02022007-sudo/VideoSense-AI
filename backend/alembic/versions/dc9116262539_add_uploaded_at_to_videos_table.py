"""add uploaded_at to videos table

Revision ID: dc9116262539
Revises: 82e890f1648d
Create Date: 2026-07-13 20:17:05.079834

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "dc9116262539"
down_revision = "82e890f1648d"
branch_labels = None
depends_on = None


def upgrade():
    # 1. Add uploaded_at as nullable
    op.add_column(
        "videos",
        sa.Column("uploaded_at", sa.DateTime(), nullable=True)
    )

    # 2. Copy existing timestamps
    op.execute("""
        UPDATE videos
        SET uploaded_at = created_at
        WHERE uploaded_at IS NULL
    """)

    # 3. Make it NOT NULL
    op.alter_column(
        "videos",
        "uploaded_at",
        nullable=False
    )

    # 4. Remove old column
    op.drop_column("videos", "created_at")


def downgrade():
    # Restore created_at
    op.add_column(
        "videos",
        sa.Column("created_at", sa.DateTime(), nullable=True)
    )

    # Copy values back
    op.execute("""
        UPDATE videos
        SET created_at = uploaded_at
        WHERE created_at IS NULL
    """)

    # Make NOT NULL again
    op.alter_column(
        "videos",
        "created_at",
        nullable=False
    )

    # Remove uploaded_at
    op.drop_column("videos", "uploaded_at")
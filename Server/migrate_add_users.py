from sqlalchemy import text

from db import engine

SQL = [
    """
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        external_id VARCHAR(255) UNIQUE NOT NULL,
        display_name VARCHAR(255),
        created_at TIMESTAMP
    );
    """,
    """
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP;
    """,
    """
    UPDATE users
    SET created_at = NOW()
    WHERE created_at IS NULL;
    """,
    """
    ALTER TABLE users
    ALTER COLUMN created_at SET DEFAULT NOW();
    """,
    """
    ALTER TABLE users
    ALTER COLUMN created_at SET NOT NULL;
    """,
    """
    ALTER TABLE conversations
    ADD COLUMN IF NOT EXISTS user_id INTEGER;
    """,
    """
    CREATE INDEX IF NOT EXISTS ix_conversations_user_id
    ON conversations (user_id);
    """,
    """
    ALTER TABLE conversations
    DROP CONSTRAINT IF EXISTS conversations_user_id_fkey;
    """,
    """
    ALTER TABLE conversations
    ADD CONSTRAINT conversations_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id);
    """,
    """
    INSERT INTO users (external_id, display_name, created_at)
    VALUES ('local-dev-user', 'Local Dev User', NOW())
    ON CONFLICT (external_id) DO NOTHING;
    """,
    """
    UPDATE conversations
    SET user_id = (SELECT id FROM users WHERE external_id = 'local-dev-user')
    WHERE user_id IS NULL;
    """,
]

with engine.begin() as conn:
    for statement in SQL:
        conn.execute(text(statement))

print("Migration completed")
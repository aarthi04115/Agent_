import os
import sqlite3

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)


class DatabaseWrapper:
    """Unified wrapper supporting both SQLite (local) and PostgreSQL (production)."""

    def __init__(self, db_url=None):
        self.db_url = db_url or os.getenv("DATABASE_URL")
        if self.db_url and self.db_url.startswith("postgres://"):
            self.db_url = self.db_url.replace("postgres://", "postgresql://", 1)

    def is_postgres(self):
        return bool(self.db_url)

    def get_connection(self):
        if self.is_postgres():
            import psycopg2
            return psycopg2.connect(self.db_url)
        else:
            db_path = "/tmp/menstrual.db" if os.getenv("VERCEL") else "menstrual.db"
            conn = sqlite3.connect(db_path, timeout=30.0)
            conn.execute("PRAGMA foreign_keys = ON")
            conn.execute("PRAGMA busy_timeout = 30000")
            return conn

    def _convert_sql(self, query: str) -> str:
        if self.is_postgres():
            # Convert SQLite '?' placeholders to PostgreSQL '%s'
            query = query.replace("?", "%s")
            # Convert SQLite AUTOINCREMENT or INTEGER PRIMARY KEY if present in DDL
            query = query.replace("INTEGER PRIMARY KEY AUTOINCREMENT", "SERIAL PRIMARY KEY")
            query = query.replace("INSERT OR IGNORE INTO", "INSERT INTO")
            if "INSERT INTO periods (" in query and "ON CONFLICT" not in query:
                query += " ON CONFLICT (user_id, start_date) DO NOTHING"
        return query


db = DatabaseWrapper()


def _connect():
    return db.get_connection()


def create_database():
    conn = _connect()
    cursor = conn.cursor()

    if db.is_postgres():
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL CHECK (role IN ('user', 'sister', 'mom'))
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS periods (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                start_date TEXT NOT NULL,
                UNIQUE (user_id, start_date),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS periods_legacy (
                id SERIAL PRIMARY KEY,
                start_date TEXT NOT NULL
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS reminder_settings (
                user_id INTEGER PRIMARY KEY,
                period_checkin_enabled INTEGER NOT NULL DEFAULT 1,
                upcoming_enabled INTEGER NOT NULL DEFAULT 1,
                upcoming_timing TEXT NOT NULL DEFAULT '3_days',
                timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
                updated_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                notification_type TEXT NOT NULL,
                scheduled_for TEXT NOT NULL,
                prediction_date TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'scheduled',
                created_at TEXT NOT NULL,
                UNIQUE (user_id, notification_type),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
    else:
        conn.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL CHECK (role IN ('user', 'sister', 'mom'))
            )
        """)

        periods_table = cursor.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'periods'"
        ).fetchone()

        if periods_table:
            columns = [row[1] for row in cursor.execute("PRAGMA table_info(periods)")]
            if "user_id" not in columns:
                cursor.execute("ALTER TABLE periods RENAME TO periods_legacy")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS periods (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL,
                start_date TEXT NOT NULL,
                UNIQUE (user_id, start_date),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS periods_legacy (
                id INTEGER PRIMARY KEY,
                start_date TEXT NOT NULL
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS reminder_settings (
                user_id INTEGER PRIMARY KEY,
                period_checkin_enabled INTEGER NOT NULL DEFAULT 1,
                upcoming_enabled INTEGER NOT NULL DEFAULT 1,
                upcoming_timing TEXT NOT NULL DEFAULT '3_days',
                timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
                updated_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL,
                notification_type TEXT NOT NULL,
                scheduled_for TEXT NOT NULL,
                prediction_date TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'scheduled',
                created_at TEXT NOT NULL,
                UNIQUE (user_id, notification_type),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)

    conn.commit()
    conn.close()


def save_period_date(start_date):
    conn = _connect()
    cursor = conn.cursor()
    query_select = db._convert_sql("SELECT 1 FROM periods_legacy WHERE start_date = ?")
    cursor.execute(query_select, (start_date,))

    if cursor.fetchone() is None:
        query_insert = db._convert_sql("INSERT INTO periods_legacy (start_date) VALUES (?)")
        cursor.execute(query_insert, (start_date,))

    conn.commit()
    conn.close()


def get_period_dates():
    conn = _connect()
    cursor = conn.cursor()
    query = db._convert_sql("SELECT start_date FROM periods_legacy ORDER BY start_date")
    cursor.execute(query)
    rows = cursor.fetchall()
    conn.close()
    return rows


def create_user(name, email, password_hash, role):
    conn = _connect()
    cursor = conn.cursor()
    if db.is_postgres():
        query = "INSERT INTO users (name, email, password_hash, role) VALUES (%s, %s, %s, %s) RETURNING id"
        cursor.execute(query, (name, email, password_hash, role))
        user_id = cursor.fetchone()[0]
    else:
        query = "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)"
        cursor.execute(query, (name, email, password_hash, role))
        user_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return user_id


def get_user_by_email(email):
    conn = _connect()
    cursor = conn.cursor()
    query = db._convert_sql("SELECT id, name, email, password_hash, role FROM users WHERE email = ?")
    cursor.execute(query, (email,))
    row = cursor.fetchone()
    conn.close()
    return row


def get_user_by_id(user_id):
    conn = _connect()
    cursor = conn.cursor()
    query = db._convert_sql("SELECT id, name, email, password_hash, role FROM users WHERE id = ?")
    cursor.execute(query, (user_id,))
    row = cursor.fetchone()
    conn.close()
    return row


def save_user_period_date(user_id, start_date):
    import time
    for attempt in range(5):
        try:
            conn = _connect()
            try:
                cursor = conn.cursor()
                if db.is_postgres():
                    query = "INSERT INTO periods (user_id, start_date) VALUES (%s, %s) ON CONFLICT (user_id, start_date) DO NOTHING"
                    cursor.execute(query, (user_id, start_date))
                    inserted = cursor.rowcount == 1
                else:
                    query = "INSERT OR IGNORE INTO periods (user_id, start_date) VALUES (?, ?)"
                    cursor.execute(query, (user_id, start_date))
                    inserted = cursor.rowcount == 1
                conn.commit()
                return inserted
            finally:
                conn.close()
        except sqlite3.OperationalError:
            if attempt == 4:
                raise
            time.sleep(0.2)


def get_user_period_dates(user_id):
    conn = _connect()
    cursor = conn.cursor()
    query = db._convert_sql("SELECT start_date FROM periods WHERE user_id = ? ORDER BY start_date")
    cursor.execute(query, (user_id,))
    rows = cursor.fetchall()
    conn.close()
    return rows


def get_family_period_dates():
    conn = _connect()
    cursor = conn.cursor()
    query = db._convert_sql("""
        SELECT users.id, users.name, users.role, periods.start_date
        FROM users
        JOIN periods ON periods.user_id = users.id
        WHERE users.role IN ('user', 'sister')
        ORDER BY users.id, periods.start_date
    """)
    cursor.execute(query)
    rows = cursor.fetchall()
    conn.close()
    return rows


def get_reminder_settings(user_id):
    conn = _connect()
    cursor = conn.cursor()
    query = db._convert_sql("""
        SELECT period_checkin_enabled, upcoming_enabled, upcoming_timing,
               timezone, updated_at
        FROM reminder_settings
        WHERE user_id = ?
    """)
    cursor.execute(query, (user_id,))
    row = cursor.fetchone()
    conn.close()
    return row


def save_reminder_settings(user_id, period_checkin_enabled, upcoming_enabled,
                           upcoming_timing, timezone, updated_at):
    conn = _connect()
    cursor = conn.cursor()
    if db.is_postgres():
        query = """
            INSERT INTO reminder_settings (
                user_id, period_checkin_enabled, upcoming_enabled,
                upcoming_timing, timezone, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT(user_id) DO UPDATE SET
                period_checkin_enabled = EXCLUDED.period_checkin_enabled,
                upcoming_enabled = EXCLUDED.upcoming_enabled,
                upcoming_timing = EXCLUDED.upcoming_timing,
                timezone = EXCLUDED.timezone,
                updated_at = EXCLUDED.updated_at
        """
        cursor.execute(query, (
            user_id,
            int(period_checkin_enabled),
            int(upcoming_enabled),
            upcoming_timing,
            timezone,
            updated_at
        ))
    else:
        query = """
            INSERT INTO reminder_settings (
                user_id, period_checkin_enabled, upcoming_enabled,
                upcoming_timing, timezone, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                period_checkin_enabled = excluded.period_checkin_enabled,
                upcoming_enabled = excluded.upcoming_enabled,
                upcoming_timing = excluded.upcoming_timing,
                timezone = excluded.timezone,
                updated_at = excluded.updated_at
        """
        cursor.execute(query, (
            user_id,
            int(period_checkin_enabled),
            int(upcoming_enabled),
            upcoming_timing,
            timezone,
            updated_at
        ))
    conn.commit()
    conn.close()


def get_user_notifications(user_id):
    conn = _connect()
    cursor = conn.cursor()
    query = db._convert_sql("""
        SELECT id, notification_type, scheduled_for, prediction_date, status
        FROM notifications
        WHERE user_id = ? AND status = 'scheduled'
        ORDER BY scheduled_for
    """)
    cursor.execute(query, (user_id,))
    rows = cursor.fetchall()
    conn.close()
    return rows


def replace_user_notifications(user_id, notifications, now):
    conn = _connect()
    cursor = conn.cursor()
    query_update = db._convert_sql("""
        UPDATE notifications
        SET status = 'cancelled'
        WHERE user_id = ? AND status = 'scheduled'
    """)
    cursor.execute(query_update, (user_id,))

    for notification in notifications:
        if db.is_postgres():
            query_insert = """
                INSERT INTO notifications (
                    user_id, notification_type, scheduled_for,
                    prediction_date, status, created_at
                )
                VALUES (%s, %s, %s, %s, 'scheduled', %s)
                ON CONFLICT(user_id, notification_type) DO UPDATE SET
                    scheduled_for = EXCLUDED.scheduled_for,
                    prediction_date = EXCLUDED.prediction_date,
                    status = 'scheduled',
                    created_at = EXCLUDED.created_at
            """
            cursor.execute(query_insert, (
                user_id,
                notification["notification_type"],
                notification["scheduled_for"],
                notification["prediction_date"],
                now
            ))
        else:
            query_insert = """
                INSERT INTO notifications (
                    user_id, notification_type, scheduled_for,
                    prediction_date, status, created_at
                )
                VALUES (?, ?, ?, ?, 'scheduled', ?)
                ON CONFLICT(user_id, notification_type) DO UPDATE SET
                    scheduled_for = excluded.scheduled_for,
                    prediction_date = excluded.prediction_date,
                    status = 'scheduled',
                    created_at = excluded.created_at
            """
            cursor.execute(query_insert, (
                user_id,
                notification["notification_type"],
                notification["scheduled_for"],
                notification["prediction_date"],
                now
            ))

    conn.commit()
    conn.close()
import sqlite3


def _connect():
    connection = sqlite3.connect("menstrual.db")
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def create_database():
    connection = _connect()

    cursor = connection.cursor()

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

    connection.commit()
    connection.close()


def save_period_date(start_date):
    connection = _connect()

    cursor = connection.cursor()

    cursor.execute(
        "SELECT 1 FROM periods_legacy WHERE start_date = ?",
        (start_date,)
    )

    if cursor.fetchone() is None:
        cursor.execute("""
            INSERT INTO periods_legacy (start_date)
            VALUES (?)
        """, (start_date,))

    connection.commit()
    connection.close()


def get_period_dates():
    connection = _connect()

    cursor = connection.cursor()

    cursor.execute("""
        SELECT start_date FROM periods_legacy
        ORDER BY start_date
    """)

    rows = cursor.fetchall()

    connection.close()

    return rows


def create_user(name, email, password_hash, role):
    connection = _connect()
    cursor = connection.cursor()
    cursor.execute("""
        INSERT INTO users (name, email, password_hash, role)
        VALUES (?, ?, ?, ?)
    """, (name, email, password_hash, role))
    user_id = cursor.lastrowid
    connection.commit()
    connection.close()
    return user_id


def get_user_by_email(email):
    connection = _connect()
    row = connection.execute("""
        SELECT id, name, email, password_hash, role
        FROM users
        WHERE email = ?
    """, (email,)).fetchone()
    connection.close()
    return row


def get_user_by_id(user_id):
    connection = _connect()
    row = connection.execute("""
        SELECT id, name, email, password_hash, role
        FROM users
        WHERE id = ?
    """, (user_id,)).fetchone()
    connection.close()
    return row


def save_user_period_date(user_id, start_date):
    connection = _connect()
    cursor = connection.cursor()
    cursor.execute("""
        INSERT OR IGNORE INTO periods (user_id, start_date)
        VALUES (?, ?)
    """, (user_id, start_date))
    inserted = cursor.rowcount == 1
    connection.commit()
    connection.close()
    return inserted


def get_user_period_dates(user_id):
    connection = _connect()
    rows = connection.execute("""
        SELECT start_date
        FROM periods
        WHERE user_id = ?
        ORDER BY start_date
    """, (user_id,)).fetchall()
    connection.close()
    return rows


def get_family_period_dates():
    connection = _connect()
    rows = connection.execute("""
        SELECT users.id, users.name, users.role, periods.start_date
        FROM users
        JOIN periods ON periods.user_id = users.id
        WHERE users.role IN ('user', 'sister')
        ORDER BY users.id, periods.start_date
    """).fetchall()
    connection.close()
    return rows


def get_reminder_settings(user_id):
    connection = _connect()
    row = connection.execute("""
        SELECT period_checkin_enabled, upcoming_enabled, upcoming_timing,
               timezone, updated_at
        FROM reminder_settings
        WHERE user_id = ?
    """, (user_id,)).fetchone()
    connection.close()
    return row


def save_reminder_settings(user_id, period_checkin_enabled, upcoming_enabled,
                           upcoming_timing, timezone, updated_at):
    connection = _connect()
    connection.execute("""
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
    """, (
        user_id,
        int(period_checkin_enabled),
        int(upcoming_enabled),
        upcoming_timing,
        timezone,
        updated_at
    ))
    connection.commit()
    connection.close()


def get_user_notifications(user_id):
    connection = _connect()
    rows = connection.execute("""
        SELECT id, notification_type, scheduled_for, prediction_date, status
        FROM notifications
        WHERE user_id = ? AND status = 'scheduled'
        ORDER BY scheduled_for
    """, (user_id,)).fetchall()
    connection.close()
    return rows


def replace_user_notifications(user_id, notifications, now):
    connection = _connect()
    connection.execute("""
        UPDATE notifications
        SET status = 'cancelled'
        WHERE user_id = ? AND status = 'scheduled'
    """, (user_id,))

    for notification in notifications:
        connection.execute("""
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
        """, (
            user_id,
            notification["notification_type"],
            notification["scheduled_for"],
            notification["prediction_date"],
            now
        ))

    connection.commit()
    connection.close()
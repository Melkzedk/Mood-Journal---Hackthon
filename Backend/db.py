import mysql.connector
from config import DB_CONFIG

def get_connection():
    return mysql.connector.connect(**DB_CONFIG)

def insert_entry(text, emotion, score):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO entries (text, emotion, score) VALUES (%s, %s, %s)",
        (text, emotion, score)
    )
    conn.commit()
    entry_id = cursor.lastrowid
    cursor.close()
    conn.close()
    return entry_id

def fetch_entries():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM entries ORDER BY timestamp DESC")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows

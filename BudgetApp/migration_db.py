from flask import Flask
from flask_sqlalchemy import SQLAlchemy
import sqlite3

# konfig aplikacji
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///budget.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# init SQLAlchemy
db = SQLAlchemy(app)


def migrate_database():
    # polaczenie z sqlite
    conn = sqlite3.connect('instance/budget.db')
    cursor = conn.cursor()

    print("Rozpoczynam migrację bazy danych...")

    # czy limit_preiod istnieje
    cursor.execute("PRAGMA table_info(settings)")
    columns = cursor.fetchall()
    column_names = [column[1] for column in columns]

    if 'limit_period' not in column_names:
        print("Dodaję kolumnę limit_period do tabeli settings...")
        try:
            # nowa kolumna do settings
            cursor.execute("ALTER TABLE settings ADD COLUMN limit_period TEXT DEFAULT 'month' NOT NULL")
            conn.commit()
            print("Kolumna limit_period została dodana pomyślnie")
        except Exception as e:
            conn.rollback()
            print(f"Błąd podczas dodawania kolumny: {e}")
    else:
        print("Kolumna limit_period już istnieje")

    conn.close()
    print("Migracja zakończona")


if __name__ == "__main__":
    with app.app_context():
        migrate_database()
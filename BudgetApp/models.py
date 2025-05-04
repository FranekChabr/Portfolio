from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

# inicjalizacja SQLAlchemy po utworzeniu app w app.py
# db = SQLAlchemy(app) V z blueprintami: db.init_app(app)
db = SQLAlchemy()

class Expense(db.Model):
    __tablename__ = 'expenses'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    date = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<Expense {self.title} - {self.amount} PLN>"

class Settings(db.Model):
    __tablename__ = 'settings'

    id = db.Column(db.Integer, primary_key=True)
    budget_limit = db.Column(db.Float, nullable=False, default=2000.0)
    limit_period = db.Column(db.String(10), nullable=False, default='month')  # 'week', 'month', 'year'
    notified = db.Column(db.Boolean, nullable=False, default=False)

    def __repr__(self):
        return f"<Settings limit={self.budget_limit} period={self.limit_period} notified={self.notified}>"
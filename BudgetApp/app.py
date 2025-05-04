from flask import Flask, render_template, redirect, url_for, flash, request
from flask_wtf import CSRFProtect
from datetime import datetime, date, timedelta
import smtplib
from email.message import EmailMessage
import os

from models import db, Expense, Settings
from forms import ExpenseForm, SettingsForm, FilterForm

from collections import defaultdict
import calendar
from decimal import Decimal #dorobic zamiast zaokraglania

# 1) konfig aplikacji
env_app = Flask(__name__)
env_app.config['SECRET_KEY'] = 'zmień_na_cos_bezpiecznego'
env_app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///budget.db'
env_app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# 2) init rozszerzen
db.init_app(env_app)
CSRFProtect(env_app)

# 3) tworzenie tabel i deafultowe przy starcie aplikacji
with env_app.app_context():
    import sqlite3

    db.create_all()

    # czy istnieje już tabela settings
    settings = Settings.query.first()
    if not settings:
        default = Settings(budget_limit=2000.0, limit_period='month', notified=False)
        db.session.add(default)
        db.session.commit()
        print("Dodano domyślne ustawienia.")

    # czy limit_preiod istnieje
    try:
        # czy plik danych istnieje
        db_path = 'instance/budget.db'
        if os.path.exists(db_path):
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("PRAGMA table_info(settings)")
            columns = cursor.fetchall()
            column_names = [column[1] for column in columns]

            if 'limit_period' not in column_names:
                print("Dodaję kolumnę limit_period do tabeli settings...")
                cursor.execute("ALTER TABLE settings ADD COLUMN limit_period TEXT DEFAULT 'month' NOT NULL")
                conn.commit()
                print("Kolumna limit_period została dodana pomyślnie")

            conn.close()
        else:
            print("Plik bazy danych nie istnieje, tabele zostaną utworzone przy pierwszym użyciu.")
    except Exception as e:
        print(f"Błąd podczas sprawdzania/migracji bazy danych: {e}")


# 4) kontekst globalny
@env_app.context_processor
def inject_current_year():
    return {'current_year': datetime.now().year}


# 5) SMTP – dane do maili
SMTP_USER = 'alert.mailowy@mail.com'
SMTP_PASS = 'haslo'
SMTP_HOST = 'smtp.mail.com'
SMTP_PORT = 587


def send_alert_email(current_expenses, limit, period):
    msg = EmailMessage()
    msg.set_content(
        f"Ostrzeżenie! Wydatki: {current_expenses:.2f} PLN przekroczyły limit {period}: {limit:.2f} PLN."
    )
    msg['Subject'] = 'Alert budżetowy'
    msg['From'] = SMTP_USER
    msg['To'] = SMTP_USER

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as smtp:
            smtp.starttls()  # Włącz TLS
            smtp.login(SMTP_USER, SMTP_PASS)
            smtp.send_message(msg)
            return True
    except Exception as e:
        print(f"Błąd wysyłania e-mail: {e}")
        return False


def get_period_expenses(period):
    """Pobiera wydatki z określonego okresu (tygodnia/miesiąca/roku)"""
    today = datetime.now()

    if period == 'week':
        # dzien tygodnia (0 to poniedzialek w pythonie)
        weekday = today.weekday()
        start_date = (today - timedelta(days=weekday)).replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = start_date + timedelta(days=7)
    elif period == 'month':
        # pierwszy dzien bieżącego miesiąca
        start_date = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        # pierwszy dzien następnego miesiąca
        if today.month == 12:
            end_date = today.replace(year=today.year + 1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            end_date = today.replace(month=today.month + 1, day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == 'year':
        # pierwszy dzien biezacego roku
        start_date = today.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        # pierwszy dzien następnego roku
        end_date = today.replace(year=today.year + 1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        # deafultowo zwracanie wszystkich wydatkow
        return db.session.query(db.func.coalesce(db.func.sum(Expense.amount), 0)).scalar()

    # filtr wedlug okresu
    period_expenses = db.session.query(db.func.coalesce(db.func.sum(Expense.amount), 0)).filter(
        Expense.date >= start_date,
        Expense.date < end_date
    ).scalar()

    return period_expenses


# 6) dashboard
@env_app.route('/')
@env_app.route('/<int:year>/<int:month>/')
def dashboard(year=None, month=None):
    settings = Settings.query.first()

    # jesli nie ma ustawien utwarzanie domyslnych
    if not settings:
        settings = Settings(budget_limit=2000.0, limit_period='month', notified=False)
        db.session.add(settings)
        db.session.commit()

    # wydatki dla akutalnego okresu
    period_expenses = get_period_expenses(settings.limit_period)

    total_expenses = db.session.query(db.func.coalesce(db.func.sum(Expense.amount), 0)).scalar()

    # beizacy miesiac i rok
    now = datetime.now()
    if year is None or month is None:
        year, month = now.year, now.month

    # sprawdzanie zakresu
    if month < 1:
        month = 12
        year -= 1
    elif month > 12:
        month = 1
        year += 1

    # obliczanie poprzedniego i nastepnego miesiaca
    prev_month = month - 1
    prev_year = year
    if prev_month < 1:
        prev_month = 12
        prev_year -= 1

    next_month = month + 1
    next_year = year
    if next_month > 12:
        next_month = 1
        next_year += 1

    month_names = ['', 'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
                   'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień']
    month_name = month_names[month]

    # dane kalendarza
    _, last_day = calendar.monthrange(year, month)
    first_weekday = calendar.monthrange(year, month)[0]  # 0 = poniedzialek w Python (xd)

    # suma dla kazdego dnia
    daily_expenses = defaultdict(float)

    # filtr wydatkow
    month_start = datetime(year, month, 1)
    if month == 12:
        next_month_start = datetime(year + 1, 1, 1)
    else:
        next_month_start = datetime(year, month + 1, 1)

    expenses = Expense.query.filter(
        Expense.date >= month_start,
        Expense.date < next_month_start
    ).all()

    # sum wydatkow kazdego dnia
    for expense in expenses:
        day = expense.date.day
        daily_expenses[day] += expense.amount

    # mapowanie okresow na polskie nazwy
    period_names = {
        'week': 'tygodniu',
        'month': 'miesiącu',
        'year': 'roku'
    }

    return render_template(
        'dashboard.html',
        current_limit=settings.budget_limit,
        period_expenses=period_expenses,
        total_expenses=total_expenses,
        period=period_names.get(settings.limit_period, settings.limit_period),
        year=year,
        month=month,
        month_name=month_name,
        last_day=last_day,
        first_weekday=first_weekday,
        daily_expenses=daily_expenses,
        prev_year=prev_year,
        prev_month=prev_month,
        next_year=next_year,
        next_month=next_month
    )


# 7) dodawanie wydatku
@env_app.route('/add', methods=['GET', 'POST'])
def add_expense():
    form = ExpenseForm()
    if form.validate_on_submit():
        # konwersja do datetime do przechowania w bazie danych
        expense_date = datetime.combine(form.date.data, datetime.min.time())

        exp = Expense(
            title=form.title.data,
            amount=form.amount.data,
            category=form.category.data,
            date=expense_date
        )
        db.session.add(exp)
        db.session.commit()

        settings = Settings.query.first()
        period_expenses = get_period_expenses(settings.limit_period)

        # mapowanie okresow na polskie nazwy
        period_names = {
            'week': 'tygodnia',
            'month': 'miesiąca',
            'year': 'roku'
        }
        period_name = period_names.get(settings.limit_period, settings.limit_period)

        if period_expenses > settings.budget_limit and not settings.notified:
            try:
                email_sent = send_alert_email(period_expenses, settings.budget_limit, period_name)
                if email_sent:
                    settings.notified = True
                    db.session.commit()
            except Exception as e:
                print(f"Błąd przy wysyłaniu maila: {e}")

            flash(f'Budżet przekroczony! Wydatki w obecnym {period_name}: {period_expenses:.2f} PLN '
                  f'(limit: {settings.budget_limit:.2f} PLN)',
                  'danger')
        else:
            flash('Wydatek dodany!', 'success')

        return redirect(url_for('dashboard'))
    return render_template('add_expense.html', form=form)


# 8) lista wydatkow
@env_app.route('/expenses', methods=['GET', 'POST'])
def view_expenses():
    # pobierz unikalne kategorie dla formularza filtrowania
    categories = [cat[0] for cat in db.session.query(Expense.category).distinct().all()]

    filter_form = FilterForm(categories=categories)
    #domyslnie od najnowszych
    query = Expense.query

    #zastosuj filtry
    if filter_form.validate_on_submit():
        if filter_form.category.data:
            query = query.filter(Expense.category == filter_form.category.data)
        if filter_form.date_from.data:
            date_from = datetime.combine(filter_form.date_from.data, datetime.min.time())
            query = query.filter(Expense.date >= date_from)
        if filter_form.date_to.data:
            date_to = datetime.combine(filter_form.date_to.data, datetime.max.time())
            query = query.filter(Expense.date <= date_to)

    expenses = query.order_by(Expense.date.desc()).all()

    total = sum(e.amount for e in expenses)

    # grupowanie wydatkow
    category_totals = {}
    for expense in expenses:
        if expense.category in category_totals:
            category_totals[expense.category] += expense.amount
        else:
            category_totals[expense.category] = expense.amount

    return render_template('view_expenses.html',
                           expenses=expenses,
                           total=total,
                           filter_form=filter_form,
                           category_totals=category_totals)


# 9) edycja wydatku
@env_app.route('/edit/<int:expense_id>', methods=['GET', 'POST'])
def edit_expense(expense_id):
    expense = Expense.query.get_or_404(expense_id)
    form = ExpenseForm(obj=expense)
    if form.validate_on_submit():
        expense.title = form.title.data
        expense.amount = form.amount.data
        expense.category = form.category.data
        expense.date = datetime.combine(form.date.data, datetime.min.time())
        db.session.commit()
        flash('Wydatek zaktualizowany!', 'success')
        return redirect(url_for('view_expenses'))
    # domyslna -> data wydatku
    form.date.data = expense.date.date()
    return render_template('edit_expense.html', form=form, expense=expense)


# 10) usuwanie wydatku
@env_app.route('/delete/<int:expense_id>', methods=['POST'])
def delete_expense(expense_id):
    expense = Expense.query.get_or_404(expense_id)
    db.session.delete(expense)
    db.session.commit()
    flash('Wydatek usunięty!', 'success')
    return redirect(url_for('view_expenses'))


# 11) ustawianie limitu budzetu
@env_app.route('/settings', methods=['GET', 'POST'])
def settings_view():
    settings = Settings.query.first()

    # jesli nie ma utworz domyslne
    if not settings:
        settings = Settings(budget_limit=2000.0, limit_period='month', notified=False)
        db.session.add(settings)
        db.session.commit()

    form = SettingsForm(obj=settings)
    if form.validate_on_submit():
        settings.budget_limit = form.budget_limit.data
        settings.limit_period = form.limit_period.data
        settings.notified = False  # reset powiadomienia przy zmianie limitu
        db.session.commit()
        flash('Ustawienia budżetu zaktualizowane', 'success')
        return redirect(url_for('settings_view'))

    period_names = {
        'week': 'tygodniu',
        'month': 'miesiącu',
        'year': 'roku'
    }
    period = period_names.get(settings.limit_period, settings.limit_period)

    return render_template('settings.html',
                           form=form,
                           current_limit=settings.budget_limit,
                           current_period=period)


# entry point
if __name__ == '__main__':
    env_app.run(debug=True)

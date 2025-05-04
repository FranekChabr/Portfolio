from flask_wtf import FlaskForm
from wtforms import StringField, FloatField, DateField, SubmitField, SelectField
from wtforms.validators import DataRequired, Length
from datetime import date


class ExpenseForm(FlaskForm):
    title = StringField(
        'Tytuł wydatku',
        validators=[DataRequired(message='Wprowadź tytuł'), Length(max=100)]
    )
    amount = FloatField(
        'Kwota [PLN]',
        validators=[DataRequired(message='Wprowadź kwotę')]
    )
    category = StringField(
        'Kategoria',
        validators=[DataRequired(message='Wprowadź kategorię'), Length(max=50)]
    )
    date = DateField(
        'Data',
        default=date.today,
        format='%Y-%m-%d',
        validators=[DataRequired(message='Wprowadź datę')]
    )
    submit = SubmitField('Zapisz wydatek')


class SettingsForm(FlaskForm):
    budget_limit = FloatField(
        'Limit budżetu [PLN]',
        validators=[DataRequired(message='Wprowadź limit budżetu')]
    )
    limit_period = SelectField(
        'Okres obowiązywania limitu',
        choices=[
            ('week', 'Tydzień'),
            ('month', 'Miesiąc'),
            ('year', 'Rok')
        ],
        validators=[DataRequired()]
    )
    submit = SubmitField('Ustaw limit')


class FilterForm(FlaskForm):
    category = SelectField('Kategoria', choices=[('', 'Wszystkie')], validate_choice=False)
    date_from = DateField('Od daty', format='%Y-%m-%d', validators=[], default=None)
    date_to = DateField('Do daty', format='%Y-%m-%d', validators=[], default=None)
    submit = SubmitField('Filtruj')

    def __init__(self, *args, categories=None, **kwargs):
        super(FilterForm, self).__init__(*args, **kwargs)
        if categories:
            self.category.choices = [('', 'Wszystkie')] + [(cat, cat) for cat in categories]
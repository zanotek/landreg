"""
Repair migration: adds application columns that migrations 0006/0007 should
have created but did not apply on the production database (django_migrations
table marked them applied while the actual ALTER TABLE never ran).

Idempotent — checks column existence before adding, safe on any DB.
"""
from django.db import migrations


MISSING_COLUMNS = [
    # (column_name, sql_type_definition)  — from migrations 0006 and 0007
    ("certificate_number",       "varchar(50)  NOT NULL DEFAULT ''"),
    ("first_registration_date",  "date         NULL"),
    ("issued_date",              "date         NULL"),
    ("received_from",            "varchar(200) NOT NULL DEFAULT ''"),
    ("received_date",            "date         NULL"),
    ("received_by",              "varchar(200) NOT NULL DEFAULT ''"),
    ("registration_date",        "date         NULL"),
    ("expiry_date",              "date         NULL"),
]


def add_missing_columns(apps, schema_editor):
    from django.db import connection
    with connection.cursor() as cursor:
        existing = {col.name for col in connection.introspection.get_table_description(cursor, 'core_application')}
    with connection.cursor() as cursor:
        for col, defn in MISSING_COLUMNS:
            if col not in existing:
                cursor.execute(f'ALTER TABLE core_application ADD COLUMN {col} {defn}')


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0008_alter_application_ownership_type_and_more'),
    ]

    operations = [
        migrations.RunPython(add_missing_columns, migrations.RunPython.noop),
    ]

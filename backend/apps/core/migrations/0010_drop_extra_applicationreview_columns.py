"""
Repair migration: drops columns that exist on core_applicationreview in
production but are no longer part of the Django model (they were moved to
core_application in migration 0006 but the RemoveField was never written).

Django omits these columns from INSERT statements, causing NOT NULL violations.
Uses introspection so it runs safely on any DB — if the columns don't exist,
nothing happens.
"""
from django.db import migrations

# Columns the current ApplicationReview model actually has
EXPECTED_REVIEW_COLUMNS = {
    'id', 'registration_number', 'volume_ref', 'folio_ref',
    'registration_entry_date', 'instrument_type', 'reviewer_notes',
    'reviewed_at', 'application_id', 'reviewed_by_id',
}


def drop_extra_columns(apps, schema_editor):
    from django.db import connection
    vendor = connection.vendor

    with connection.cursor() as cursor:
        actual = {col.name for col in connection.introspection.get_table_description(cursor, 'core_applicationreview')}

    extras = actual - EXPECTED_REVIEW_COLUMNS
    if not extras:
        return

    with connection.cursor() as cursor:
        for col in extras:
            if vendor == 'postgresql':
                cursor.execute(f'ALTER TABLE core_applicationreview DROP COLUMN IF EXISTS "{col}"')
            else:
                # SQLite doesn't support DROP COLUMN in older versions; skip
                pass


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0009_repair_missing_application_columns'),
    ]

    operations = [
        migrations.RunPython(drop_extra_columns, migrations.RunPython.noop),
    ]

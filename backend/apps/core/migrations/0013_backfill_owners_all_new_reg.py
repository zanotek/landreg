"""
Backfill owners from all new_registration applications, regardless of status.
Previous migrations only created owners from approved applications; owners
should exist as soon as an application is submitted.
"""
from django.db import migrations


def backfill(apps, schema_editor):
    Application = apps.get_model('core', 'Application')
    Owner = apps.get_model('core', 'Owner')

    qs = Application.objects.filter(
        application_type='new_registration',
    ).prefetch_related('proprietors')

    for app in qs:
        primary = app.proprietors.filter(is_primary=True).first()
        if not primary or not primary.national_id:
            continue
        name_parts = primary.full_name.strip().split(None, 1)
        Owner.objects.update_or_create(
            national_id=primary.national_id,
            defaults={
                'first_name': name_parts[0] if name_parts else '',
                'last_name': name_parts[1] if len(name_parts) > 1 else '',
                'phone': primary.phone or '',
                'email': primary.email or '',
                'address': primary.address or '',
            },
        )


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0012_backfill_owners_no_parcel'),
    ]

    operations = [
        migrations.RunPython(backfill, migrations.RunPython.noop),
    ]

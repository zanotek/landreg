"""
Fix for backfill migration 0011 which skipped approved applications that
had no parcel linked. Owners should be created even without a parcel;
only TitleDeed creation requires one.
"""
from django.db import migrations


def backfill_owners(apps, schema_editor):
    Application = apps.get_model('core', 'Application')
    Owner = apps.get_model('core', 'Owner')

    qs = Application.objects.filter(
        application_type='new_registration',
        status='approved',
    ).prefetch_related('proprietors')

    for app in qs:
        primary = app.proprietors.filter(is_primary=True).first()
        if not primary:
            continue
        name_parts = primary.full_name.strip().split(None, 1)
        Owner.objects.get_or_create(
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
        ('core', '0011_backfill_owners_and_deeds'),
    ]

    operations = [
        migrations.RunPython(backfill_owners, migrations.RunPython.noop),
    ]

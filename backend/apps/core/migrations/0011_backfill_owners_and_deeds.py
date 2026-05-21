"""
Backfill owners and title deeds from existing approved new_registration
applications. Idempotent — uses get_or_create throughout.
"""
from django.db import migrations
from django.utils import timezone


def backfill(apps, schema_editor):
    Application = apps.get_model('core', 'Application')
    Owner = apps.get_model('core', 'Owner')
    TitleDeed = apps.get_model('core', 'TitleDeed')

    qs = Application.objects.filter(
        application_type='new_registration',
        status='approved',
    ).select_related('review').prefetch_related('proprietors')

    for app in qs:
        if not app.parcel_id:
            continue

        primary = app.proprietors.filter(is_primary=True).first()
        if not primary:
            continue

        name_parts = primary.full_name.strip().split(None, 1)
        owner, _ = Owner.objects.get_or_create(
            national_id=primary.national_id,
            defaults={
                'first_name': name_parts[0] if name_parts else '',
                'last_name': name_parts[1] if len(name_parts) > 1 else '',
                'phone': primary.phone or '',
                'email': primary.email or '',
                'address': primary.address or '',
            },
        )

        review = getattr(app, 'review', None)
        deed_number = (
            review.registration_number
            if review and review.registration_number
            else f"DEED-{app.application_number}"
        )
        registration_date = (
            review.registration_entry_date
            if review and review.registration_entry_date
            else timezone.now().date()
        )

        TitleDeed.objects.get_or_create(
            deed_number=deed_number,
            defaults={
                'parcel_id': app.parcel_id,
                'owner': owner,
                'registered_by_id': None,
                'ownership_type': app.ownership_type or '',
                'certificate_number': app.certificate_number or '',
                'registration_date': registration_date,
                'first_registration_date': app.first_registration_date,
                'issued_date': app.issued_date,
                'received_from': app.received_from or '',
                'received_date': app.received_date,
                'received_by': app.received_by or '',
                'expiry_date': app.expiry_date,
                'status': 'active',
            },
        )


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0010_drop_extra_applicationreview_columns'),
    ]

    operations = [
        migrations.RunPython(backfill, migrations.RunPython.noop),
    ]

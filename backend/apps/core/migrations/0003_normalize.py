import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def migrate_forward(apps, schema_editor):
    Application = apps.get_model('core', 'Application')
    Proprietor = apps.get_model('core', 'Proprietor')
    ApplicationReview = apps.get_model('core', 'ApplicationReview')
    ApplicationApproval = apps.get_model('core', 'ApplicationApproval')
    LandParcel = apps.get_model('core', 'LandParcel')

    for app in Application.objects.all():
        # 1. Migrate flat proprietor fields → Proprietor row
        Proprietor.objects.create(
            application=app,
            full_name=app.applicant_name or '',
            national_id=app.applicant_national_id or '',
            id_type='national_id',
            phone=app.applicant_phone or '',
            email=app.applicant_email or '',
            address=app.applicant_address or '',
            is_primary=True,
        )

        # 2. Migrate step2 fields → ApplicationReview (only if review data exists)
        has_review = any([
            app.registration_number,
            app.volume_ref,
            app.folio_ref,
            app.registration_entry_date,
            app.instrument_type,
            app.reviewer_notes,
        ])
        if has_review:
            ApplicationReview.objects.create(
                application=app,
                registration_number=app.registration_number or None,
                volume_ref=app.volume_ref or '',
                folio_ref=app.folio_ref or '',
                registration_entry_date=app.registration_entry_date,
                instrument_type=app.instrument_type or '',
                reviewer_notes=app.reviewer_notes or '',
                reviewed_by=app.step2_by,
                reviewed_at=app.step2_at,
            )

        # 3. Migrate step3 fields → ApplicationApproval (only if approval data exists)
        if app.registrar_notes or app.step3_by_id:
            ApplicationApproval.objects.create(
                application=app,
                registrar_notes=app.registrar_notes or '',
                approved_by=app.step3_by,
                approved_at=app.step3_at,
            )

        # 4. Carry ward/village_or_block/encumbrances to the linked parcel
        if app.parcel_id and (app.ward or app.village_or_block or app.encumbrances):
            LandParcel.objects.filter(pk=app.parcel_id).update(
                ward=app.ward or '',
                village_or_block=app.village_or_block or '',
                encumbrances=app.encumbrances or '',
            )


def migrate_backward(apps, schema_editor):
    apps.get_model('core', 'Proprietor').objects.all().delete()
    apps.get_model('core', 'ApplicationReview').objects.all().delete()
    apps.get_model('core', 'ApplicationApproval').objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_workflow'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # ── Phase A: Add LandParcel location fields ───────────────────────────
        migrations.AddField(
            model_name='landparcel',
            name='ward',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='landparcel',
            name='village_or_block',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='landparcel',
            name='encumbrances',
            field=models.TextField(blank=True),
        ),

        # ── Phase A: Create Proprietor ────────────────────────────────────────
        migrations.CreateModel(
            name='Proprietor',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('full_name', models.CharField(max_length=200)),
                ('national_id', models.CharField(max_length=50)),
                ('id_type', models.CharField(
                    max_length=20,
                    choices=[
                        ('national_id', 'National ID'),
                        ('passport', 'Passport'),
                        ('company_reg', 'Company Registration'),
                    ],
                    default='national_id',
                )),
                ('phone', models.CharField(blank=True, max_length=20)),
                ('email', models.EmailField(blank=True, max_length=254)),
                ('address', models.TextField(blank=True)),
                ('is_primary', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('application', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='proprietors',
                    to='core.application',
                )),
            ],
            options={'ordering': ['-is_primary', 'full_name']},
        ),

        # ── Phase A: Create ApplicationReview ─────────────────────────────────
        migrations.CreateModel(
            name='ApplicationReview',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('registration_number', models.CharField(blank=True, max_length=50, null=True, unique=True)),
                ('volume_ref', models.CharField(blank=True, max_length=50)),
                ('folio_ref', models.CharField(blank=True, max_length=50)),
                ('registration_entry_date', models.DateField(blank=True, null=True)),
                ('instrument_type', models.CharField(
                    blank=True,
                    max_length=20,
                    choices=[
                        ('first_registration', 'First Registration'),
                        ('transfer', 'Transfer'),
                        ('charge', 'Charge / Mortgage'),
                        ('discharge', 'Discharge'),
                        ('subdivision', 'Subdivision'),
                        ('amalgamation', 'Amalgamation'),
                        ('correction', 'Correction'),
                    ],
                )),
                ('reviewer_notes', models.TextField(blank=True)),
                ('reviewed_at', models.DateTimeField(blank=True, null=True)),
                ('application', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='review',
                    to='core.application',
                )),
                ('reviewed_by', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='applications_reviewed',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
        ),

        # ── Phase A: Create ApplicationApproval ───────────────────────────────
        migrations.CreateModel(
            name='ApplicationApproval',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('registrar_notes', models.TextField(blank=True)),
                ('approved_at', models.DateTimeField(blank=True, null=True)),
                ('application', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='approval',
                    to='core.application',
                )),
                ('approved_by', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='applications_approved',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
        ),

        # ── Phase B: Data migration ────────────────────────────────────────────
        migrations.RunPython(migrate_forward, migrate_backward),

        # ── Phase C: Remove denormalized Application fields ────────────────────
        migrations.RemoveField(model_name='application', name='applicant_name'),
        migrations.RemoveField(model_name='application', name='applicant_national_id'),
        migrations.RemoveField(model_name='application', name='applicant_phone'),
        migrations.RemoveField(model_name='application', name='applicant_email'),
        migrations.RemoveField(model_name='application', name='applicant_address'),
        migrations.RemoveField(model_name='application', name='co_proprietors'),
        migrations.RemoveField(model_name='application', name='ward'),
        migrations.RemoveField(model_name='application', name='village_or_block'),
        migrations.RemoveField(model_name='application', name='encumbrances'),
        migrations.RemoveField(model_name='application', name='registration_number'),
        migrations.RemoveField(model_name='application', name='volume_ref'),
        migrations.RemoveField(model_name='application', name='folio_ref'),
        migrations.RemoveField(model_name='application', name='registration_entry_date'),
        migrations.RemoveField(model_name='application', name='instrument_type'),
        migrations.RemoveField(model_name='application', name='reviewer_notes'),
        migrations.RemoveField(model_name='application', name='registrar_notes'),
        migrations.RemoveField(model_name='application', name='step2_by'),
        migrations.RemoveField(model_name='application', name='step2_at'),
        migrations.RemoveField(model_name='application', name='step3_by'),
        migrations.RemoveField(model_name='application', name='step3_at'),
    ]

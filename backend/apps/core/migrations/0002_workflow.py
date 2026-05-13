import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # ── UserProfile: update role choices & default ────────────────────────
        migrations.AlterField(
            model_name='userprofile',
            name='role',
            field=models.CharField(
                default='data_entry',
                max_length=20,
                choices=[
                    ('admin', 'Administrator'),
                    ('data_entry', 'Data Entry Officer'),
                    ('reviewing_officer', 'Reviewing Officer'),
                    ('registrar', 'Registrar'),
                ],
            ),
        ),

        # ── Application: update existing fields ───────────────────────────────
        migrations.AlterField(
            model_name='application',
            name='application_type',
            field=models.CharField(
                max_length=30,
                choices=[
                    ('new_registration', 'New Registration'),
                    ('transfer', 'Transfer of Ownership'),
                    ('subdivision', 'Subdivision & Amalgamation'),
                    ('mortgage', 'Mortgage & Charge'),
                    ('correction', 'Correction & Amendment'),
                ],
            ),
        ),
        migrations.AlterField(
            model_name='application',
            name='status',
            field=models.CharField(
                default='step1',
                max_length=20,
                choices=[
                    ('step1', 'Step 1 – Data Entry'),
                    ('step2', 'Step 2 – Under Review'),
                    ('step3', 'Step 3 – Pending Approval'),
                    ('returned', 'Returned for Correction'),
                    ('approved', 'Approved'),
                    ('rejected', 'Rejected'),
                    ('cancelled', 'Cancelled'),
                ],
            ),
        ),
        migrations.AlterField(
            model_name='application',
            name='description',
            field=models.TextField(blank=True),
        ),

        # ── Application: remove old fields ────────────────────────────────────
        migrations.RemoveField(model_name='application', name='applicant_national_id'),
        migrations.RemoveField(model_name='application', name='applicant_phone'),
        migrations.RemoveField(model_name='application', name='applicant_email'),
        migrations.RemoveField(model_name='application', name='applicant_name'),
        migrations.RemoveField(model_name='application', name='submitted_by'),
        migrations.RemoveField(model_name='application', name='reviewed_by'),
        migrations.RemoveField(model_name='application', name='reviewed_at'),
        migrations.RemoveField(model_name='application', name='rejection_reason'),
        migrations.RemoveField(model_name='application', name='notes'),

        # ── Application: add Step 1 proprietorship fields ─────────────────────
        migrations.AddField(
            model_name='application',
            name='applicant_name',
            field=models.CharField(max_length=200, default=''),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='application',
            name='applicant_national_id',
            field=models.CharField(max_length=50, default=''),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='application',
            name='applicant_phone',
            field=models.CharField(max_length=20, default=''),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='application',
            name='applicant_email',
            field=models.EmailField(blank=True),
        ),
        migrations.AddField(
            model_name='application',
            name='applicant_address',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='application',
            name='ownership_type',
            field=models.CharField(
                max_length=10,
                blank=True,
                default='sole',
                choices=[
                    ('sole', 'Sole Ownership'),
                    ('joint', 'Joint Ownership'),
                    ('company', 'Company'),
                ],
            ),
        ),
        migrations.AddField(
            model_name='application',
            name='co_proprietors',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='application',
            name='scanned_deed_url',
            field=models.URLField(blank=True),
        ),

        # ── Application: add Step 1 property fields ───────────────────────────
        migrations.AddField(
            model_name='application',
            name='ward',
            field=models.CharField(max_length=100, blank=True),
        ),
        migrations.AddField(
            model_name='application',
            name='village_or_block',
            field=models.CharField(max_length=100, blank=True),
        ),
        migrations.AddField(
            model_name='application',
            name='encumbrances',
            field=models.TextField(blank=True),
        ),

        # ── Application: add Step 2 fields ────────────────────────────────────
        migrations.AddField(
            model_name='application',
            name='registration_number',
            field=models.CharField(max_length=50, blank=True, null=True, unique=True),
        ),
        migrations.AddField(
            model_name='application',
            name='volume_ref',
            field=models.CharField(max_length=50, blank=True),
        ),
        migrations.AddField(
            model_name='application',
            name='folio_ref',
            field=models.CharField(max_length=50, blank=True),
        ),
        migrations.AddField(
            model_name='application',
            name='registration_entry_date',
            field=models.DateField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='application',
            name='instrument_type',
            field=models.CharField(
                max_length=20,
                blank=True,
                choices=[
                    ('first_registration', 'First Registration'),
                    ('transfer', 'Transfer'),
                    ('charge', 'Charge / Mortgage'),
                    ('discharge', 'Discharge'),
                    ('subdivision', 'Subdivision'),
                    ('amalgamation', 'Amalgamation'),
                    ('correction', 'Correction'),
                ],
            ),
        ),
        migrations.AddField(
            model_name='application',
            name='reviewer_notes',
            field=models.TextField(blank=True),
        ),

        # ── Application: add Step 3 fields ────────────────────────────────────
        migrations.AddField(
            model_name='application',
            name='registrar_notes',
            field=models.TextField(blank=True),
        ),

        # ── Application: add return/workflow fields ───────────────────────────
        migrations.AddField(
            model_name='application',
            name='returned_to_step',
            field=models.IntegerField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='application',
            name='return_reason',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='application',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),

        # ── Application: add per-step officer tracking ────────────────────────
        migrations.AddField(
            model_name='application',
            name='step1_by',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='applications_step1',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='application',
            name='step1_at',
            field=models.DateTimeField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='application',
            name='step2_by',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='applications_step2',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='application',
            name='step2_at',
            field=models.DateTimeField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='application',
            name='step3_by',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='applications_step3',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='application',
            name='step3_at',
            field=models.DateTimeField(null=True, blank=True),
        ),
    ]

from django.db import migrations, models


APPLICATION_TYPES = [
    (0, 'new_registration', 'New Registration'),
    (1, 'transfer', 'Transfer of Ownership'),
    (2, 'subdivision', 'Subdivision & Amalgamation'),
    (3, 'mortgage', 'Mortgage & Charge'),
    (4, 'correction', 'Correction & Amendment'),
]

APPLICATION_STATUSES = [
    (0, 'step1', 'Step 1 – Records Module'),
    (1, 'step2', 'Step 2 – Registration Module'),
    (2, 'step3', 'Step 3 – Pending Approval'),
    (3, 'returned', 'Returned for Correction'),
    (4, 'approved', 'Approved'),
    (5, 'rejected', 'Rejected'),
    (6, 'cancelled', 'Cancelled'),
]


def prefill(apps, schema_editor):
    ApplicationType = apps.get_model('core', 'ApplicationType')
    ApplicationStatus = apps.get_model('core', 'ApplicationStatus')
    for order, code, label in APPLICATION_TYPES:
        ApplicationType.objects.get_or_create(code=code, defaults={'label': label, 'display_order': order})
    for order, code, label in APPLICATION_STATUSES:
        ApplicationStatus.objects.get_or_create(code=code, defaults={'label': label, 'display_order': order})


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0013_backfill_owners_all_new_reg'),
    ]

    operations = [
        migrations.CreateModel(
            name='ApplicationType',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.CharField(max_length=50, unique=True)),
                ('label', models.CharField(max_length=100)),
                ('is_active', models.BooleanField(default=True)),
                ('display_order', models.PositiveIntegerField(default=0)),
            ],
            options={'ordering': ['display_order', 'label']},
        ),
        migrations.CreateModel(
            name='ApplicationStatus',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.CharField(max_length=50, unique=True)),
                ('label', models.CharField(max_length=100)),
                ('is_active', models.BooleanField(default=True)),
                ('display_order', models.PositiveIntegerField(default=0)),
            ],
            options={'ordering': ['display_order', 'label']},
        ),
        migrations.RunPython(prefill, migrations.RunPython.noop),
    ]

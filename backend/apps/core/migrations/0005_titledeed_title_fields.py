from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0004_parcel_zupin_house_region_shehia'),
    ]

    operations = [
        migrations.AddField(
            model_name='titledeed',
            name='ownership_type',
            field=models.CharField(
                blank=True,
                max_length=10,
                choices=[
                    ('sole', 'Sole Ownership'),
                    ('joint', 'Joint Ownership'),
                    ('company', 'Company'),
                ],
            ),
        ),
        migrations.AddField(
            model_name='titledeed',
            name='certificate_number',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name='titledeed',
            name='first_registration_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='titledeed',
            name='issued_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='titledeed',
            name='received_from',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='titledeed',
            name='received_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='titledeed',
            name='received_by',
            field=models.CharField(blank=True, max_length=200),
        ),
    ]

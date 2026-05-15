from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0005_titledeed_title_fields'),
    ]

    operations = [
        # Application receipt fields (Step 1)
        migrations.AddField(
            model_name='application',
            name='received_from',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='application',
            name='received_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='application',
            name='received_by',
            field=models.CharField(blank=True, max_length=200),
        ),
        # ApplicationReview title fields (Step 2)
        migrations.AddField(
            model_name='applicationreview',
            name='certificate_number',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name='applicationreview',
            name='first_registration_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='applicationreview',
            name='issued_date',
            field=models.DateField(blank=True, null=True),
        ),
    ]

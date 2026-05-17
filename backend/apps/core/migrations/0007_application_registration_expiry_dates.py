from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0006_application_receipt_review_title_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='application',
            name='registration_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='application',
            name='expiry_date',
            field=models.DateField(blank=True, null=True),
        ),
    ]

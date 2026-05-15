from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0003_normalize'),
    ]

    operations = [
        migrations.AddField(
            model_name='landparcel',
            name='zupin',
            field=models.CharField(blank=True, max_length=50, null=True, unique=True),
        ),
        migrations.AddField(
            model_name='landparcel',
            name='house_number',
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name='landparcel',
            name='region',
            field=models.CharField(
                blank=True,
                max_length=20,
                choices=[
                    ('mjini_magharibi', 'Mjini Magharibi'),
                    ('kaskazini_unguja', 'Kaskazini Unguja'),
                    ('kusini_unguja', 'Kusini Unguja'),
                    ('kaskazini_pemba', 'Kaskazini Pemba'),
                    ('kusini_pemba', 'Kusini Pemba'),
                ],
            ),
        ),
        migrations.AddField(
            model_name='landparcel',
            name='shehia',
            field=models.CharField(blank=True, max_length=100),
        ),
    ]

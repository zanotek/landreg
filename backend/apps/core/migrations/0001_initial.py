import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Owner',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('national_id', models.CharField(max_length=50, unique=True)),
                ('first_name', models.CharField(max_length=100)),
                ('last_name', models.CharField(max_length=100)),
                ('phone', models.CharField(max_length=20)),
                ('email', models.EmailField(blank=True, max_length=254)),
                ('address', models.TextField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={'ordering': ['last_name', 'first_name']},
        ),
        migrations.CreateModel(
            name='LandParcel',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('parcel_number', models.CharField(max_length=50, unique=True)),
                ('district', models.CharField(max_length=50, choices=[('mjini', 'Mjini (Urban West)'), ('magharibi', 'Magharibi (West)'), ('kaskazini_a', 'Kaskazini A (North A)'), ('kaskazini_b', 'Kaskazini B (North B)'), ('kati', 'Kati (Central)'), ('kusini', 'Kusini (South)'), ('chake_chake', 'Chake Chake (Pemba)'), ('mkoani', 'Mkoani (Pemba)'), ('wete', 'Wete (Pemba)'), ('micheweni', 'Micheweni (Pemba)')])),
                ('area_sqm', models.DecimalField(decimal_places=2, max_digits=12)),
                ('land_use', models.CharField(max_length=20, choices=[('residential', 'Residential'), ('commercial', 'Commercial'), ('agricultural', 'Agricultural'), ('industrial', 'Industrial'), ('institutional', 'Institutional'), ('mixed', 'Mixed Use')])),
                ('location_description', models.TextField()),
                ('status', models.CharField(default='available', max_length=20, choices=[('available', 'Available'), ('registered', 'Registered'), ('pending', 'Pending Registration'), ('disputed', 'Disputed'), ('suspended', 'Suspended')])),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='parcels_created', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-created_at']},
        ),
        migrations.CreateModel(
            name='TitleDeed',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('deed_number', models.CharField(max_length=50, unique=True)),
                ('registration_date', models.DateField()),
                ('expiry_date', models.DateField(blank=True, null=True)),
                ('status', models.CharField(default='active', max_length=20, choices=[('active', 'Active'), ('transferred', 'Transferred'), ('cancelled', 'Cancelled'), ('suspended', 'Suspended')])),
                ('notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('owner', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='deeds', to='core.owner')),
                ('parcel', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='deeds', to='core.landparcel')),
                ('registered_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='deeds_registered', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-created_at']},
        ),
        migrations.CreateModel(
            name='Application',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('application_number', models.CharField(blank=True, max_length=50, unique=True)),
                ('applicant_name', models.CharField(max_length=200)),
                ('applicant_national_id', models.CharField(max_length=50)),
                ('applicant_phone', models.CharField(max_length=20)),
                ('applicant_email', models.EmailField(blank=True, max_length=254)),
                ('application_type', models.CharField(max_length=30, choices=[('new_registration', 'New Registration'), ('transfer', 'Transfer of Ownership'), ('subdivision', 'Subdivision'), ('correction', 'Correction of Records'), ('cancellation', 'Cancellation')])),
                ('parcel_number_requested', models.CharField(blank=True, max_length=50)),
                ('description', models.TextField()),
                ('status', models.CharField(default='pending', max_length=20, choices=[('pending', 'Pending'), ('under_review', 'Under Review'), ('approved', 'Approved'), ('rejected', 'Rejected'), ('cancelled', 'Cancelled')])),
                ('submitted_at', models.DateTimeField(auto_now_add=True)),
                ('reviewed_at', models.DateTimeField(null=True, blank=True)),
                ('rejection_reason', models.TextField(blank=True)),
                ('notes', models.TextField(blank=True)),
                ('parcel', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='applications', to='core.landparcel')),
                ('reviewed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='applications_reviewed', to=settings.AUTH_USER_MODEL)),
                ('submitted_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='applications_submitted', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-submitted_at']},
        ),
        migrations.CreateModel(
            name='UserProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('role', models.CharField(default='officer', max_length=20, choices=[('admin', 'Administrator'), ('officer', 'Registration Officer'), ('public', 'Public User')])),
                ('phone', models.CharField(blank=True, max_length=20)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='profile', to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]

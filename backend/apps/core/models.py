import datetime
from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('admin', 'Administrator'),
        ('data_entry', 'Data Entry Officer'),
        ('reviewing_officer', 'Reviewing Officer'),
        ('registrar', 'Registrar'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='data_entry')
    phone = models.CharField(max_length=20, blank=True)

    def __str__(self):
        return f"{self.user.username} ({self.get_role_display()})"


ZANZIBAR_DISTRICTS = [
    ('mjini', 'Mjini (Urban West)'),
    ('magharibi', 'Magharibi (West)'),
    ('kaskazini_a', 'Kaskazini A (North A)'),
    ('kaskazini_b', 'Kaskazini B (North B)'),
    ('kati', 'Kati (Central)'),
    ('kusini', 'Kusini (South)'),
    ('chake_chake', 'Chake Chake (Pemba)'),
    ('mkoani', 'Mkoani (Pemba)'),
    ('wete', 'Wete (Pemba)'),
    ('micheweni', 'Micheweni (Pemba)'),
]

INSTRUMENT_CHOICES = [
    ('first_registration', 'First Registration'),
    ('transfer', 'Transfer'),
    ('charge', 'Charge / Mortgage'),
    ('discharge', 'Discharge'),
    ('subdivision', 'Subdivision'),
    ('amalgamation', 'Amalgamation'),
    ('correction', 'Correction'),
]


class LandParcel(models.Model):
    LAND_USE_CHOICES = [
        ('residential', 'Residential'),
        ('commercial', 'Commercial'),
        ('agricultural', 'Agricultural'),
        ('industrial', 'Industrial'),
        ('institutional', 'Institutional'),
        ('mixed', 'Mixed Use'),
    ]
    STATUS_CHOICES = [
        ('available', 'Available'),
        ('registered', 'Registered'),
        ('pending', 'Pending Registration'),
        ('disputed', 'Disputed'),
        ('suspended', 'Suspended'),
    ]

    parcel_number = models.CharField(max_length=50, unique=True)
    district = models.CharField(max_length=50, choices=ZANZIBAR_DISTRICTS)
    area_sqm = models.DecimalField(max_digits=12, decimal_places=2)
    land_use = models.CharField(max_length=20, choices=LAND_USE_CHOICES)
    location_description = models.TextField()
    ward = models.CharField(max_length=100, blank=True)
    village_or_block = models.CharField(max_length=100, blank=True)
    encumbrances = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='parcels_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Parcel {self.parcel_number} – {self.get_district_display()}"


class Application(models.Model):
    TYPE_CHOICES = [
        ('new_registration', 'New Registration'),
        ('transfer', 'Transfer of Ownership'),
        ('subdivision', 'Subdivision & Amalgamation'),
        ('mortgage', 'Mortgage & Charge'),
        ('correction', 'Correction & Amendment'),
    ]
    STATUS_CHOICES = [
        ('step1', 'Step 1 – Data Entry'),
        ('step2', 'Step 2 – Under Review'),
        ('step3', 'Step 3 – Pending Approval'),
        ('returned', 'Returned for Correction'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    ]
    OWNERSHIP_CHOICES = [
        ('sole', 'Sole Ownership'),
        ('joint', 'Joint Ownership'),
        ('company', 'Company'),
    ]

    application_number = models.CharField(max_length=50, unique=True, blank=True)
    application_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    parcel = models.ForeignKey(
        LandParcel, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='applications',
    )
    parcel_number_requested = models.CharField(max_length=50, blank=True)
    ownership_type = models.CharField(
        max_length=10, choices=OWNERSHIP_CHOICES, default='sole'
    )
    scanned_deed_url = models.URLField(blank=True)
    description = models.TextField(blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='step1')
    returned_to_step = models.IntegerField(null=True, blank=True)
    return_reason = models.TextField(blank=True)

    step1_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='applications_step1',
    )
    step1_at = models.DateTimeField(null=True, blank=True)

    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-submitted_at']

    def __str__(self):
        return f"Application {self.application_number}"

    def save(self, *args, **kwargs):
        if not self.application_number:
            year = datetime.datetime.now().year
            count = Application.objects.filter(submitted_at__year=year).count() + 1
            self.application_number = f"APP-{year}-{count:04d}"
        super().save(*args, **kwargs)


class Proprietor(models.Model):
    ID_TYPE_CHOICES = [
        ('national_id', 'National ID'),
        ('passport', 'Passport'),
        ('company_reg', 'Company Registration'),
    ]

    application = models.ForeignKey(
        Application, on_delete=models.CASCADE, related_name='proprietors'
    )
    full_name = models.CharField(max_length=200)
    national_id = models.CharField(max_length=50)
    id_type = models.CharField(max_length=20, choices=ID_TYPE_CHOICES, default='national_id')
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-is_primary', 'full_name']

    def __str__(self):
        label = 'primary' if self.is_primary else 'co-proprietor'
        return f"{self.full_name} ({label})"


class ApplicationReview(models.Model):
    application = models.OneToOneField(
        Application, on_delete=models.CASCADE, related_name='review'
    )
    registration_number = models.CharField(max_length=50, blank=True, null=True, unique=True)
    volume_ref = models.CharField(max_length=50, blank=True)
    folio_ref = models.CharField(max_length=50, blank=True)
    registration_entry_date = models.DateField(null=True, blank=True)
    instrument_type = models.CharField(
        max_length=20, choices=INSTRUMENT_CHOICES, blank=True
    )
    reviewer_notes = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='applications_reviewed',
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Review – {self.application.application_number}"


class ApplicationApproval(models.Model):
    application = models.OneToOneField(
        Application, on_delete=models.CASCADE, related_name='approval'
    )
    registrar_notes = models.TextField(blank=True)
    approved_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='applications_approved',
    )
    approved_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Approval – {self.application.application_number}"

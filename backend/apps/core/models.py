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


class Owner(models.Model):
    national_id = models.CharField(max_length=50, unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    address = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['last_name', 'first_name']

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.national_id})"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"


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

    @property
    def active_deed(self):
        return self.deeds.filter(status='active').first()


class TitleDeed(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('transferred', 'Transferred'),
        ('cancelled', 'Cancelled'),
        ('suspended', 'Suspended'),
    ]

    deed_number = models.CharField(max_length=50, unique=True)
    parcel = models.ForeignKey(LandParcel, on_delete=models.PROTECT, related_name='deeds')
    owner = models.ForeignKey(Owner, on_delete=models.PROTECT, related_name='deeds')
    registration_date = models.DateField()
    expiry_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    registered_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='deeds_registered'
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Deed {self.deed_number}"

    def save(self, *args, **kwargs):
        if self.status == 'active' and self.pk:
            LandParcel.objects.filter(pk=self.parcel_id).update(status='registered')
        super().save(*args, **kwargs)


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
    INSTRUMENT_CHOICES = [
        ('first_registration', 'First Registration'),
        ('transfer', 'Transfer'),
        ('charge', 'Charge / Mortgage'),
        ('discharge', 'Discharge'),
        ('subdivision', 'Subdivision'),
        ('amalgamation', 'Amalgamation'),
        ('correction', 'Correction'),
    ]

    application_number = models.CharField(max_length=50, unique=True, blank=True)

    # ── Step 1: Property Information ──────────────────────────────────────────
    application_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    parcel = models.ForeignKey(
        LandParcel, on_delete=models.SET_NULL, null=True, blank=True, related_name='applications'
    )
    parcel_number_requested = models.CharField(max_length=50, blank=True)
    ward = models.CharField(max_length=100, blank=True)
    village_or_block = models.CharField(max_length=100, blank=True)
    encumbrances = models.TextField(blank=True, help_text='Encumbrances or restrictions on the deed')
    description = models.TextField(blank=True)

    # ── Step 1: Proprietorship Information ───────────────────────────────────
    applicant_name = models.CharField(max_length=200)
    applicant_national_id = models.CharField(max_length=50)
    applicant_phone = models.CharField(max_length=20)
    applicant_email = models.EmailField(blank=True)
    applicant_address = models.TextField(blank=True)
    ownership_type = models.CharField(
        max_length=10, choices=OWNERSHIP_CHOICES, default='sole', blank=True
    )
    co_proprietors = models.TextField(
        blank=True, help_text='Names and ID details of co-proprietors (for joint ownership)'
    )
    scanned_deed_url = models.URLField(
        blank=True, help_text='URL or path of the scanned title deed attachment'
    )

    # ── Step 2: Registration Information (filled by Reviewing Officer) ────────
    registration_number = models.CharField(max_length=50, blank=True, unique=True, null=True)
    volume_ref = models.CharField(max_length=50, blank=True)
    folio_ref = models.CharField(max_length=50, blank=True)
    registration_entry_date = models.DateField(null=True, blank=True)
    instrument_type = models.CharField(
        max_length=20, choices=INSTRUMENT_CHOICES, blank=True
    )
    reviewer_notes = models.TextField(blank=True, help_text='Notes or flags for the Registrar')

    # ── Step 3: Registrar ─────────────────────────────────────────────────────
    registrar_notes = models.TextField(blank=True)

    # ── Workflow status & return handling ─────────────────────────────────────
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='step1')
    returned_to_step = models.IntegerField(null=True, blank=True)
    return_reason = models.TextField(blank=True)

    # ── Per-step officer tracking ─────────────────────────────────────────────
    step1_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='applications_step1'
    )
    step1_at = models.DateTimeField(null=True, blank=True)
    step2_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='applications_step2'
    )
    step2_at = models.DateTimeField(null=True, blank=True)
    step3_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='applications_step3'
    )
    step3_at = models.DateTimeField(null=True, blank=True)

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

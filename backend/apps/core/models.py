import datetime
from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('admin', 'Administrator'),
        ('officer', 'Registration Officer'),
        ('public', 'Public User'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='officer')
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
        # When a deed is activated, mark the parcel as registered
        if self.status == 'active' and self.pk:
            LandParcel.objects.filter(pk=self.parcel_id).update(status='registered')
        super().save(*args, **kwargs)


class Application(models.Model):
    TYPE_CHOICES = [
        ('new_registration', 'New Registration'),
        ('transfer', 'Transfer of Ownership'),
        ('subdivision', 'Subdivision'),
        ('correction', 'Correction of Records'),
        ('cancellation', 'Cancellation'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('under_review', 'Under Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    ]

    application_number = models.CharField(max_length=50, unique=True, blank=True)
    # Applicant details
    applicant_name = models.CharField(max_length=200)
    applicant_national_id = models.CharField(max_length=50)
    applicant_phone = models.CharField(max_length=20)
    applicant_email = models.EmailField(blank=True)
    # Application details
    application_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    parcel = models.ForeignKey(
        LandParcel, on_delete=models.SET_NULL, null=True, blank=True, related_name='applications'
    )
    parcel_number_requested = models.CharField(max_length=50, blank=True)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    # Tracking
    submitted_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='applications_submitted'
    )
    reviewed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='applications_reviewed'
    )
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    notes = models.TextField(blank=True)

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

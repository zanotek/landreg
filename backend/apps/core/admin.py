from django.contrib import admin
from .models import UserProfile, Application


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'role', 'phone']
    list_filter = ['role']
    search_fields = ['user__username', 'user__first_name', 'user__last_name']


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = [
        'application_number', 'applicant_name', 'applicant_national_id',
        'application_type', 'status', 'step1_by', 'step2_by', 'step3_by', 'submitted_at',
    ]
    list_filter = ['status', 'application_type', 'ownership_type']
    search_fields = ['application_number', 'applicant_name', 'applicant_national_id', 'registration_number']
    readonly_fields = ['application_number', 'submitted_at', 'updated_at']
    fieldsets = [
        ('Reference', {
            'fields': ['application_number', 'submitted_at', 'updated_at', 'status'],
        }),
        ('Step 1 — Property Information', {
            'fields': [
                'application_type', 'parcel', 'parcel_number_requested',
                'ward', 'village_or_block', 'encumbrances', 'description',
            ],
        }),
        ('Step 1 — Proprietorship', {
            'fields': [
                'applicant_name', 'applicant_national_id', 'applicant_phone',
                'applicant_email', 'applicant_address',
                'ownership_type', 'co_proprietors', 'scanned_deed_url',
            ],
        }),
        ('Step 1 — Officer', {
            'fields': ['step1_by', 'step1_at'],
        }),
        ('Step 2 — Review', {
            'fields': [
                'registration_number', 'volume_ref', 'folio_ref',
                'registration_entry_date', 'instrument_type', 'reviewer_notes',
            ],
        }),
        ('Step 2 — Officer', {
            'fields': ['step2_by', 'step2_at'],
        }),
        ('Step 3 — Registrar', {
            'fields': ['registrar_notes'],
        }),
        ('Step 3 — Officer', {
            'fields': ['step3_by', 'step3_at'],
        }),
        ('Return Handling', {
            'fields': ['returned_to_step', 'return_reason'],
        }),
    ]

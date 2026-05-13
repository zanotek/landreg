from django.contrib import admin
from .models import (
    UserProfile, LandParcel, Application,
    Proprietor, ApplicationReview, ApplicationApproval,
)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'role', 'phone']
    list_filter = ['role']
    search_fields = ['user__username', 'user__first_name', 'user__last_name']


@admin.register(LandParcel)
class LandParcelAdmin(admin.ModelAdmin):
    list_display = ['parcel_number', 'district', 'area_sqm', 'land_use', 'status', 'created_at']
    list_filter = ['district', 'land_use', 'status']
    search_fields = ['parcel_number', 'location_description']


class ProprietorInline(admin.TabularInline):
    model = Proprietor
    extra = 0
    fields = ['full_name', 'national_id', 'id_type', 'phone', 'email', 'address', 'is_primary']


class ApplicationReviewInline(admin.StackedInline):
    model = ApplicationReview
    extra = 0
    fields = [
        'registration_number', 'volume_ref', 'folio_ref',
        'registration_entry_date', 'instrument_type',
        'reviewer_notes', 'reviewed_by', 'reviewed_at',
    ]


class ApplicationApprovalInline(admin.StackedInline):
    model = ApplicationApproval
    extra = 0
    fields = ['registrar_notes', 'approved_by', 'approved_at']


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = [
        'application_number', 'application_type', 'ownership_type',
        'status', 'step1_by', 'submitted_at',
    ]
    list_filter = ['status', 'application_type', 'ownership_type']
    search_fields = [
        'application_number',
        'proprietors__full_name',
        'proprietors__national_id',
    ]
    readonly_fields = ['application_number', 'submitted_at', 'updated_at']
    inlines = [ProprietorInline, ApplicationReviewInline, ApplicationApprovalInline]
    fieldsets = [
        ('Reference', {
            'fields': ['application_number', 'status', 'submitted_at', 'updated_at'],
        }),
        ('Application Details', {
            'fields': [
                'application_type', 'parcel', 'parcel_number_requested',
                'ownership_type', 'scanned_deed_url', 'description',
            ],
        }),
        ('Step 1 Officer', {
            'fields': ['step1_by', 'step1_at'],
        }),
        ('Return Handling', {
            'fields': ['returned_to_step', 'return_reason'],
            'classes': ['collapse'],
        }),
    ]

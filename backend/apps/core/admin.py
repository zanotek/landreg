from django.contrib import admin
from .models import UserProfile, Owner, LandParcel, TitleDeed, Application


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'role', 'phone']
    list_filter = ['role']


@admin.register(Owner)
class OwnerAdmin(admin.ModelAdmin):
    list_display = ['national_id', 'first_name', 'last_name', 'phone', 'email', 'created_at']
    search_fields = ['national_id', 'first_name', 'last_name', 'phone']


@admin.register(LandParcel)
class LandParcelAdmin(admin.ModelAdmin):
    list_display = ['parcel_number', 'district', 'area_sqm', 'land_use', 'status', 'created_at']
    list_filter = ['district', 'land_use', 'status']
    search_fields = ['parcel_number', 'location_description']


@admin.register(TitleDeed)
class TitleDeedAdmin(admin.ModelAdmin):
    list_display = ['deed_number', 'parcel', 'owner', 'registration_date', 'status']
    list_filter = ['status']
    search_fields = ['deed_number', 'parcel__parcel_number', 'owner__first_name', 'owner__last_name']
    raw_id_fields = ['parcel', 'owner']


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = [
        'application_number', 'applicant_name', 'application_type', 'status', 'submitted_at'
    ]
    list_filter = ['status', 'application_type']
    search_fields = ['application_number', 'applicant_name', 'applicant_national_id']

from django.contrib.auth.models import User
from rest_framework import serializers
from .models import UserProfile, Owner, LandParcel, TitleDeed, Application


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['role', 'phone']


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name', 'profile']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class UserCreateSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(
        choices=UserProfile.ROLE_CHOICES, write_only=True, default='data_entry'
    )
    phone = serializers.CharField(write_only=True, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'password', 'role', 'phone']

    def create(self, validated_data):
        role = validated_data.pop('role', 'data_entry')
        phone = validated_data.pop('phone', '')
        password = validated_data.pop('password')
        user = User.objects.create_user(password=password, **validated_data)
        UserProfile.objects.create(user=user, role=role, phone=phone)
        return user


# ── Owner ─────────────────────────────────────────────────────────────────────

class OwnerSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    deed_count = serializers.SerializerMethodField()

    class Meta:
        model = Owner
        fields = [
            'id', 'national_id', 'first_name', 'last_name', 'full_name',
            'phone', 'email', 'address', 'deed_count', 'created_at',
        ]

    def get_deed_count(self, obj):
        return obj.deeds.filter(status='active').count()


# ── Land Parcel ───────────────────────────────────────────────────────────────

class LandParcelListSerializer(serializers.ModelSerializer):
    district_display = serializers.CharField(source='get_district_display', read_only=True)
    land_use_display = serializers.CharField(source='get_land_use_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = LandParcel
        fields = [
            'id', 'parcel_number', 'district', 'district_display',
            'area_sqm', 'land_use', 'land_use_display', 'status', 'status_display',
            'location_description', 'created_at',
        ]


class LandParcelDetailSerializer(LandParcelListSerializer):
    deeds = serializers.SerializerMethodField()

    class Meta(LandParcelListSerializer.Meta):
        fields = LandParcelListSerializer.Meta.fields + ['deeds', 'updated_at']

    def get_deeds(self, obj):
        return TitleDeedListSerializer(obj.deeds.all(), many=True).data


# ── Title Deed ────────────────────────────────────────────────────────────────

class TitleDeedListSerializer(serializers.ModelSerializer):
    parcel_number = serializers.CharField(source='parcel.parcel_number', read_only=True)
    owner_name = serializers.CharField(source='owner.full_name', read_only=True)
    owner_national_id = serializers.CharField(source='owner.national_id', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    registered_by_name = serializers.SerializerMethodField()

    class Meta:
        model = TitleDeed
        fields = [
            'id', 'deed_number', 'parcel', 'parcel_number',
            'owner', 'owner_name', 'owner_national_id',
            'registration_date', 'expiry_date', 'status', 'status_display',
            'registered_by_name', 'notes', 'created_at',
        ]

    def get_registered_by_name(self, obj):
        if obj.registered_by:
            return obj.registered_by.get_full_name() or obj.registered_by.username
        return None


class TitleDeedWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = TitleDeed
        fields = [
            'deed_number', 'parcel', 'owner', 'registration_date',
            'expiry_date', 'status', 'notes',
        ]

    def validate(self, data):
        parcel = data.get('parcel')
        if parcel and data.get('status', 'active') == 'active':
            existing = TitleDeed.objects.filter(parcel=parcel, status='active')
            if self.instance:
                existing = existing.exclude(pk=self.instance.pk)
            if existing.exists():
                raise serializers.ValidationError(
                    {'parcel': 'This parcel already has an active title deed.'}
                )
        return data


# ── Application ───────────────────────────────────────────────────────────────

def _officer_name(user):
    if user:
        return user.get_full_name() or user.username
    return None


class ApplicationListSerializer(serializers.ModelSerializer):
    application_type_display = serializers.CharField(
        source='get_application_type_display', read_only=True
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    parcel_number = serializers.CharField(source='parcel.parcel_number', read_only=True)
    step1_by_name = serializers.SerializerMethodField()
    step2_by_name = serializers.SerializerMethodField()
    step3_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = [
            # Identity
            'id', 'application_number',
            # Step 1 — property
            'application_type', 'application_type_display',
            'parcel', 'parcel_number', 'parcel_number_requested',
            'ward', 'village_or_block', 'encumbrances', 'description',
            # Step 1 — proprietorship
            'applicant_name', 'applicant_national_id', 'applicant_phone',
            'applicant_email', 'applicant_address',
            'ownership_type', 'co_proprietors', 'scanned_deed_url',
            # Step 2
            'registration_number', 'volume_ref', 'folio_ref',
            'registration_entry_date', 'instrument_type', 'reviewer_notes',
            # Step 3
            'registrar_notes',
            # Workflow
            'status', 'status_display',
            'returned_to_step', 'return_reason',
            # Tracking
            'step1_by', 'step1_by_name', 'step1_at',
            'step2_by', 'step2_by_name', 'step2_at',
            'step3_by', 'step3_by_name', 'step3_at',
            'submitted_at', 'updated_at',
        ]

    def get_step1_by_name(self, obj):
        return _officer_name(obj.step1_by)

    def get_step2_by_name(self, obj):
        return _officer_name(obj.step2_by)

    def get_step3_by_name(self, obj):
        return _officer_name(obj.step3_by)


class ApplicationStep1Serializer(serializers.ModelSerializer):
    """Written by the Data Entry Officer."""
    class Meta:
        model = Application
        fields = [
            'application_type', 'parcel', 'parcel_number_requested',
            'ward', 'village_or_block', 'encumbrances', 'description',
            'applicant_name', 'applicant_national_id', 'applicant_phone',
            'applicant_email', 'applicant_address',
            'ownership_type', 'co_proprietors', 'scanned_deed_url',
        ]


class ApplicationStep2Serializer(serializers.ModelSerializer):
    """Written by the Reviewing Officer."""
    class Meta:
        model = Application
        fields = [
            'registration_number', 'volume_ref', 'folio_ref',
            'registration_entry_date', 'instrument_type', 'reviewer_notes',
            # Allow returning the record
            'returned_to_step', 'return_reason',
        ]


class ApplicationStep3Serializer(serializers.ModelSerializer):
    """Written by the Registrar."""
    class Meta:
        model = Application
        fields = ['registrar_notes', 'returned_to_step', 'return_reason']

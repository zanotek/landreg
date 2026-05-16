from django.contrib.auth.models import User
from rest_framework import serializers
from .models import (
    Owner, UserProfile, LandParcel, Application,
    Proprietor, ApplicationReview, ApplicationApproval, TitleDeed,
)


def _officer_name(user):
    if user:
        return user.get_full_name() or user.username
    return None


# ── User ──────────────────────────────────────────────────────────────────────

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


# ── Land Parcel ───────────────────────────────────────────────────────────────

class LandParcelSerializer(serializers.ModelSerializer):
    district_display = serializers.CharField(source='get_district_display', read_only=True)
    land_use_display = serializers.CharField(source='get_land_use_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    region_display = serializers.CharField(source='get_region_display', read_only=True)

    class Meta:
        model = LandParcel
        fields = [
            'id', 'parcel_number', 'zupin', 'house_number',
            'district', 'district_display',
            'region', 'region_display', 'shehia',
            'area_sqm', 'land_use', 'land_use_display',
            'location_description', 'ward', 'village_or_block', 'encumbrances',
            'status', 'status_display', 'created_at',
        ]


class LandParcelWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = LandParcel
        fields = [
            'id',
            'parcel_number', 'zupin', 'house_number',
            'district', 'region', 'shehia',
            'area_sqm', 'land_use',
            'location_description', 'ward', 'village_or_block', 'encumbrances',
        ]
        read_only_fields = ['id']


# ── Proprietor ────────────────────────────────────────────────────────────────

class ProprietorSerializer(serializers.ModelSerializer):
    id_type_display = serializers.CharField(source='get_id_type_display', read_only=True)

    class Meta:
        model = Proprietor
        fields = [
            'id', 'full_name', 'national_id', 'id_type', 'id_type_display',
            'phone', 'email', 'address', 'is_primary',
        ]


# ── ApplicationReview ─────────────────────────────────────────────────────────

class ApplicationReviewSerializer(serializers.ModelSerializer):
    reviewed_by_name = serializers.SerializerMethodField()
    instrument_type_display = serializers.CharField(
        source='get_instrument_type_display', read_only=True
    )

    class Meta:
        model = ApplicationReview
        fields = [
            'registration_number', 'volume_ref', 'folio_ref',
            'registration_entry_date', 'instrument_type', 'instrument_type_display',
            'reviewer_notes', 'reviewed_by_name', 'reviewed_at',
        ]

    def get_reviewed_by_name(self, obj):
        return _officer_name(obj.reviewed_by)


class ApplicationReviewWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApplicationReview
        fields = [
            'registration_number', 'volume_ref', 'folio_ref',
            'registration_entry_date', 'instrument_type', 'reviewer_notes',
        ]


# ── ApplicationApproval ───────────────────────────────────────────────────────

class ApplicationApprovalSerializer(serializers.ModelSerializer):
    approved_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ApplicationApproval
        fields = ['registrar_notes', 'approved_by_name', 'approved_at']

    def get_approved_by_name(self, obj):
        return _officer_name(obj.approved_by)


class ApplicationApprovalWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApplicationApproval
        fields = ['registrar_notes']


# ── Application ───────────────────────────────────────────────────────────────

class ApplicationListSerializer(serializers.ModelSerializer):
    application_type_display = serializers.CharField(
        source='get_application_type_display', read_only=True
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    ownership_type_display = serializers.CharField(
        source='get_ownership_type_display', read_only=True
    )
    step1_by_name = serializers.SerializerMethodField()
    parcel_detail = LandParcelSerializer(source='parcel', read_only=True)
    parcel_number = serializers.CharField(source='parcel.parcel_number', read_only=True)

    # Nested relations
    proprietors = ProprietorSerializer(many=True, read_only=True)
    review = ApplicationReviewSerializer(read_only=True)
    approval = ApplicationApprovalSerializer(read_only=True)

    class Meta:
        model = Application
        fields = [
            'id', 'application_number',
            'application_type', 'application_type_display',
            'parcel', 'parcel_number', 'parcel_detail',
            'parcel_number_requested',
            'ownership_type', 'ownership_type_display',
            'scanned_deed_url', 'description',
            'certificate_number', 'first_registration_date', 'issued_date',
            'received_from', 'received_date', 'received_by',
            'status', 'status_display',
            'returned_to_step', 'return_reason',
            'step1_by', 'step1_by_name', 'step1_at',
            'submitted_at', 'updated_at',
            # Nested
            'proprietors', 'review', 'approval',
        ]

    def get_step1_by_name(self, obj):
        return _officer_name(obj.step1_by)


class ApplicationStep1Serializer(serializers.ModelSerializer):
    """Handles create and Step 1 edits. Accepts nested proprietors and optional new_parcel."""
    proprietors = ProprietorSerializer(many=True)
    new_parcel = LandParcelWriteSerializer(required=False, allow_null=True, write_only=True)

    class Meta:
        model = Application
        fields = [
            'id',
            'application_type', 'parcel', 'parcel_number_requested',
            'ownership_type', 'scanned_deed_url', 'description',
            'certificate_number', 'first_registration_date', 'issued_date',
            'received_from', 'received_date', 'received_by',
            'proprietors', 'new_parcel',
        ]

    def validate(self, data):
        proprietors = data.get('proprietors', [])
        primary_count = sum(1 for p in proprietors if p.get('is_primary'))
        if proprietors and primary_count != 1:
            raise serializers.ValidationError(
                {'proprietors': 'Exactly one proprietor must be marked is_primary=true.'}
            )
        return data

    def _handle_parcel(self, validated_data):
        new_parcel_data = validated_data.pop('new_parcel', None)
        if new_parcel_data and not validated_data.get('parcel'):
            request = self.context.get('request')
            created_by = request.user if request else None
            parcel = LandParcel.objects.create(created_by=created_by, **new_parcel_data)
            validated_data['parcel'] = parcel
        return validated_data

    def create(self, validated_data):
        proprietors_data = validated_data.pop('proprietors', [])
        validated_data = self._handle_parcel(validated_data)
        application = Application.objects.create(**validated_data)
        for p in proprietors_data:
            Proprietor.objects.create(application=application, **p)
        return application

    def update(self, instance, validated_data):
        proprietors_data = validated_data.pop('proprietors', None)
        validated_data = self._handle_parcel(validated_data)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        if proprietors_data is not None:
            instance.proprietors.all().delete()
            for p in proprietors_data:
                Proprietor.objects.create(application=instance, **p)
        return instance


# ── Owner ─────────────────────────────────────────────────────────────────────

class OwnerSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = Owner
        fields = [
            'id', 'national_id', 'first_name', 'last_name', 'full_name',
            'phone', 'email', 'address', 'created_at',
        ]


# ── TitleDeed ─────────────────────────────────────────────────────────────────

class TitleDeedSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    ownership_type_display = serializers.CharField(
        source='get_ownership_type_display', read_only=True
    )
    parcel_number = serializers.CharField(source='parcel.parcel_number', read_only=True)
    owner_name = serializers.CharField(source='owner.full_name', read_only=True)
    owner_national_id = serializers.CharField(source='owner.national_id', read_only=True)
    registered_by_name = serializers.SerializerMethodField()

    class Meta:
        model = TitleDeed
        fields = [
            'id', 'deed_number',
            'parcel', 'parcel_number',
            'owner', 'owner_name', 'owner_national_id',
            'registered_by', 'registered_by_name',
            'ownership_type', 'ownership_type_display',
            'certificate_number',
            'registration_date', 'first_registration_date', 'issued_date',
            'received_from', 'received_date', 'received_by',
            'expiry_date', 'status', 'status_display', 'notes',
            'created_at',
        ]

    def get_registered_by_name(self, obj):
        return _officer_name(obj.registered_by)


class TitleDeedWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = TitleDeed
        fields = [
            'id',
            'deed_number', 'parcel', 'owner',
            'ownership_type', 'certificate_number',
            'registration_date', 'first_registration_date', 'issued_date',
            'received_from', 'received_date', 'received_by',
            'expiry_date', 'status', 'notes',
        ]
        read_only_fields = ['id']

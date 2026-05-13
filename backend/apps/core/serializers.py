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
        choices=UserProfile.ROLE_CHOICES, write_only=True, default='officer'
    )
    phone = serializers.CharField(write_only=True, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'password', 'role', 'phone']

    def create(self, validated_data):
        role = validated_data.pop('role', 'officer')
        phone = validated_data.pop('phone', '')
        password = validated_data.pop('password')
        user = User.objects.create_user(password=password, **validated_data)
        UserProfile.objects.create(user=user, role=role, phone=phone)
        return user


# ── Owner ────────────────────────────────────────────────────────────────────

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

class ApplicationListSerializer(serializers.ModelSerializer):
    application_type_display = serializers.CharField(
        source='get_application_type_display', read_only=True
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    parcel_number = serializers.CharField(source='parcel.parcel_number', read_only=True)
    reviewed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = [
            'id', 'application_number', 'applicant_name', 'applicant_national_id',
            'applicant_phone', 'applicant_email', 'application_type', 'application_type_display',
            'parcel', 'parcel_number', 'parcel_number_requested', 'description',
            'status', 'status_display', 'reviewed_by_name',
            'submitted_at', 'reviewed_at', 'rejection_reason', 'notes',
        ]

    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by:
            return obj.reviewed_by.get_full_name() or obj.reviewed_by.username
        return None


class ApplicationWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Application
        fields = [
            'applicant_name', 'applicant_national_id', 'applicant_phone', 'applicant_email',
            'application_type', 'parcel', 'parcel_number_requested', 'description',
            'status', 'rejection_reason', 'notes',
        ]


class ApplicationReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Application
        fields = ['status', 'rejection_reason', 'notes']

    def validate_status(self, value):
        allowed = ('under_review', 'approved', 'rejected', 'cancelled')
        if value not in allowed:
            raise serializers.ValidationError(f"Status must be one of: {', '.join(allowed)}")
        return value

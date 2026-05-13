from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Owner, LandParcel, TitleDeed, Application
from .serializers import (
    UserSerializer, UserCreateSerializer,
    OwnerSerializer,
    LandParcelListSerializer, LandParcelDetailSerializer,
    TitleDeedListSerializer, TitleDeedWriteSerializer,
    ApplicationListSerializer, ApplicationWriteSerializer, ApplicationReviewSerializer,
)


class IsAdminOrOfficer(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        try:
            return request.user.profile.role in ('admin', 'officer')
        except Exception:
            return False


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        try:
            return request.user.profile.role == 'admin'
        except Exception:
            return False


# ── Auth / Me ─────────────────────────────────────────────────────────────────

class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


# ── Stats ─────────────────────────────────────────────────────────────────────

class StatsView(APIView):
    permission_classes = [IsAdminOrOfficer]

    def get(self, request):
        return Response({
            'total_parcels': LandParcel.objects.count(),
            'registered_parcels': LandParcel.objects.filter(status='registered').count(),
            'active_deeds': TitleDeed.objects.filter(status='active').count(),
            'total_owners': Owner.objects.count(),
            'pending_applications': Application.objects.filter(status='pending').count(),
            'under_review_applications': Application.objects.filter(status='under_review').count(),
            'approved_applications': Application.objects.filter(status='approved').count(),
            'total_applications': Application.objects.count(),
        })


# ── User management ───────────────────────────────────────────────────────────

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.select_related('profile').all()
    filter_backends = [filters.SearchFilter]
    search_fields = ['username', 'email', 'first_name', 'last_name']

    def get_permissions(self):
        if self.action == 'create':
            return [IsAdmin()]
        return [IsAdminOrOfficer()]

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer


# ── Owners ────────────────────────────────────────────────────────────────────

class OwnerViewSet(viewsets.ModelViewSet):
    queryset = Owner.objects.all()
    serializer_class = OwnerSerializer
    permission_classes = [IsAdminOrOfficer]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['national_id', 'first_name', 'last_name', 'phone', 'email']
    ordering_fields = ['last_name', 'created_at']
    ordering = ['last_name']


# ── Land Parcels ──────────────────────────────────────────────────────────────

class LandParcelViewSet(viewsets.ModelViewSet):
    queryset = LandParcel.objects.select_related('created_by').all()
    permission_classes = [IsAdminOrOfficer]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['parcel_number', 'location_description', 'district']
    ordering_fields = ['parcel_number', 'created_at', 'area_sqm']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return LandParcelDetailSerializer
        return LandParcelListSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        district = self.request.query_params.get('district')
        land_use = self.request.query_params.get('land_use')
        parcel_status = self.request.query_params.get('status')
        if district:
            qs = qs.filter(district=district)
        if land_use:
            qs = qs.filter(land_use=land_use)
        if parcel_status:
            qs = qs.filter(status=parcel_status)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


# ── Title Deeds ───────────────────────────────────────────────────────────────

class TitleDeedViewSet(viewsets.ModelViewSet):
    queryset = TitleDeed.objects.select_related('parcel', 'owner', 'registered_by').all()
    permission_classes = [IsAdminOrOfficer]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['deed_number', 'parcel__parcel_number', 'owner__first_name', 'owner__last_name']
    ordering_fields = ['deed_number', 'registration_date', 'created_at']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return TitleDeedWriteSerializer
        return TitleDeedListSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        deed_status = self.request.query_params.get('status')
        if deed_status:
            qs = qs.filter(status=deed_status)
        return qs

    def perform_create(self, serializer):
        deed = serializer.save(registered_by=self.request.user)
        # Mark parcel as registered when deed is active
        if deed.status == 'active':
            LandParcel.objects.filter(pk=deed.parcel_id).update(status='registered')


# ── Applications ──────────────────────────────────────────────────────────────

class ApplicationViewSet(viewsets.ModelViewSet):
    queryset = Application.objects.select_related(
        'parcel', 'submitted_by', 'reviewed_by'
    ).all()
    permission_classes = [IsAdminOrOfficer]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['application_number', 'applicant_name', 'applicant_national_id']
    ordering_fields = ['application_number', 'submitted_at']
    ordering = ['-submitted_at']

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return ApplicationWriteSerializer
        return ApplicationListSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        app_status = self.request.query_params.get('status')
        app_type = self.request.query_params.get('application_type')
        if app_status:
            qs = qs.filter(status=app_status)
        if app_type:
            qs = qs.filter(application_type=app_type)
        return qs

    def perform_create(self, serializer):
        serializer.save(submitted_by=self.request.user)

    @action(detail=True, methods=['patch'], url_path='review')
    def review(self, request, pk=None):
        application = self.get_object()
        serializer = ApplicationReviewSerializer(application, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(reviewed_by=request.user, reviewed_at=timezone.now())
        return Response(ApplicationListSerializer(application).data)

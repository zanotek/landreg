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
    ApplicationListSerializer,
    ApplicationStep1Serializer, ApplicationStep2Serializer, ApplicationStep3Serializer,
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
            'step1_applications': Application.objects.filter(status='step1').count(),
            'step2_applications': Application.objects.filter(status='step2').count(),
            'step3_applications': Application.objects.filter(status='step3').count(),
            'returned_applications': Application.objects.filter(status='returned').count(),
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
        'parcel', 'step1_by', 'step2_by', 'step3_by'
    ).all()
    permission_classes = [IsAdminOrOfficer]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['application_number', 'applicant_name', 'applicant_national_id']
    ordering_fields = ['application_number', 'submitted_at']
    ordering = ['-submitted_at']

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return ApplicationStep1Serializer
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
        serializer.save(status='step1')

    @action(detail=True, methods=['patch'], url_path='submit-step1')
    def submit_step1(self, request, pk=None):
        """Data Entry Officer submits Step 1, advancing to Step 2."""
        app = self.get_object()
        serializer = ApplicationStep1Serializer(app, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(status='step2', step1_by=request.user, step1_at=timezone.now())
        return Response(ApplicationListSerializer(app).data)

    @action(detail=True, methods=['patch'], url_path='submit-step2')
    def submit_step2(self, request, pk=None):
        """Reviewing Officer submits Step 2. Can advance to Step 3 or return to Step 1."""
        app = self.get_object()
        serializer = ApplicationStep2Serializer(app, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        returned_to = request.data.get('returned_to_step')
        if returned_to:
            serializer.save(status='returned')
        else:
            serializer.save(status='step3', step2_by=request.user, step2_at=timezone.now())
        return Response(ApplicationListSerializer(app).data)

    @action(detail=True, methods=['patch'], url_path='submit-step3')
    def submit_step3(self, request, pk=None):
        """Registrar approves or returns the application."""
        app = self.get_object()
        serializer = ApplicationStep3Serializer(app, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        returned_to = request.data.get('returned_to_step')
        if returned_to:
            serializer.save(status='returned')
        else:
            serializer.save(status='approved', step3_by=request.user, step3_at=timezone.now())
        return Response(ApplicationListSerializer(app).data)

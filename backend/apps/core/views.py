from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    LandParcel, Application,
    ApplicationReview, ApplicationApproval,
)
from .serializers import (
    UserSerializer, UserCreateSerializer,
    LandParcelSerializer,
    ApplicationListSerializer, ApplicationStep1Serializer,
    ApplicationReviewWriteSerializer, ApplicationApprovalWriteSerializer,
)


class IsAdminOrOfficer(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        try:
            return request.user.profile.role in ('admin', 'data_entry', 'reviewing_officer', 'registrar')
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
            'total_applications': Application.objects.count(),
            'step1_applications': Application.objects.filter(status='step1').count(),
            'step2_applications': Application.objects.filter(status='step2').count(),
            'step3_applications': Application.objects.filter(status='step3').count(),
            'returned_applications': Application.objects.filter(status='returned').count(),
            'approved_applications': Application.objects.filter(status='approved').count(),
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


# ── Land Parcels ──────────────────────────────────────────────────────────────

class LandParcelViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only list/retrieve for parcel selection in forms."""
    queryset = LandParcel.objects.all()
    serializer_class = LandParcelSerializer
    permission_classes = [IsAdminOrOfficer]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['parcel_number', 'location_description', 'district']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        district = self.request.query_params.get('district')
        if district:
            qs = qs.filter(district=district)
        return qs


# ── Applications ──────────────────────────────────────────────────────────────

class ApplicationViewSet(viewsets.ModelViewSet):
    queryset = Application.objects.select_related(
        'parcel', 'step1_by',
        'review__reviewed_by',
        'approval__approved_by',
    ).prefetch_related('proprietors').all()

    permission_classes = [IsAdminOrOfficer]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        'application_number',
        'proprietors__full_name',
        'proprietors__national_id',
    ]
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

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    @action(detail=True, methods=['patch'], url_path='submit-step1')
    def submit_step1(self, request, pk=None):
        """Data Entry Officer submits Step 1, advancing to Step 2."""
        app = self.get_object()
        serializer = ApplicationStep1Serializer(
            app, data=request.data, partial=True,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(status='step2', step1_by=request.user, step1_at=timezone.now())
        app.refresh_from_db()
        return Response(ApplicationListSerializer(app, context={'request': request}).data)

    @action(detail=True, methods=['patch'], url_path='submit-step2')
    def submit_step2(self, request, pk=None):
        """Reviewing Officer submits Step 2: advances to Step 3 or returns."""
        app = self.get_object()
        returned_to = request.data.get('returned_to_step')

        if returned_to:
            app.status = 'returned'
            app.returned_to_step = returned_to
            app.return_reason = request.data.get('return_reason', '')
            app.save(update_fields=['status', 'returned_to_step', 'return_reason', 'updated_at'])
        else:
            review_data = {
                k: v for k, v in request.data.items()
                if k not in ('returned_to_step', 'return_reason')
            }
            review, _ = ApplicationReview.objects.get_or_create(application=app)
            serializer = ApplicationReviewWriteSerializer(review, data=review_data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save(reviewed_by=request.user, reviewed_at=timezone.now())
            app.status = 'step3'
            app.save(update_fields=['status', 'updated_at'])

        app.refresh_from_db()
        return Response(ApplicationListSerializer(app, context={'request': request}).data)

    @action(detail=True, methods=['patch'], url_path='submit-step3')
    def submit_step3(self, request, pk=None):
        """Registrar approves or returns the application."""
        app = self.get_object()
        returned_to = request.data.get('returned_to_step')

        if returned_to:
            app.status = 'returned'
            app.returned_to_step = returned_to
            app.return_reason = request.data.get('return_reason', '')
            app.save(update_fields=['status', 'returned_to_step', 'return_reason', 'updated_at'])
        else:
            approval_data = {
                k: v for k, v in request.data.items()
                if k not in ('returned_to_step', 'return_reason')
            }
            approval, _ = ApplicationApproval.objects.get_or_create(application=app)
            serializer = ApplicationApprovalWriteSerializer(approval, data=approval_data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save(approved_by=request.user, approved_at=timezone.now())
            app.status = 'approved'
            app.save(update_fields=['status', 'updated_at'])

        app.refresh_from_db()
        return Response(ApplicationListSerializer(app, context={'request': request}).data)

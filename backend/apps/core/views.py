import json
import os

import anthropic
from django.contrib.auth.models import User
from django.http import StreamingHttpResponse
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


# ── AI Assistant ──────────────────────────────────────────────────────────────

ASSISTANT_SYSTEM_PROMPT = """You are an AI assistant embedded in a multi-user internal land title registration system used at a land registrar's office. You guide officers through their specific step in the title registration workflow. You only address the officer currently logged in and active on a record — you do not perform another officer's step on their behalf.

---

## SYSTEM OVERVIEW

Title deeds originate from the adjudication office and are received physically. The registration process has three sequential officer steps. Each step must be completed and saved before the next officer can proceed. The system handles five registration types:

- New land title registration
- Title transfer (sale / purchase)
- Subdivision & amalgamation
- Mortgages & charges
- Corrections & amendments

---

## STEP 1 — DATA ENTRY OFFICER

### Role
The Data Entry Officer opens a new record in the system and captures all property and proprietorship information from the physical title deed received from the adjudication office.

### Property information to capture
- Land reference / parcel number
- Location: region, district, ward, and village or block number
- Land use / category (e.g. residential, agricultural, commercial)
- Area / size (with unit: acres, hectares, or square metres)
- Any encumbrances or restrictions noted on the deed

### Proprietorship information to capture
- Full name of proprietor(s)
- Identity type and number (national ID, passport, or company registration number)
- Address of proprietor(s)
- Nature of ownership (sole, joint, company)
- For joint ownership: names and ID details of all co-proprietors

### Document upload
- Scan and attach the physical title deed received from the adjudication office
- Confirm the scan is complete, legible, and all pages are included
- Label the attachment clearly with the parcel number and registration type

### Completion
Before submitting to Step 2, confirm:
- All property fields are filled
- All proprietorship fields are filled
- The scanned title deed is attached and legible
- Registration type is selected

---

## STEP 2 — REVIEWING OFFICER

### Role
The Reviewing Officer examines the record entered in Step 1, verifies accuracy and completeness, then fills in the formal registration information and assigns the unique registration number.

### Review checks
- Property information matches the scanned title deed exactly (parcel number, location, area, land use)
- Proprietorship details are consistent with the identity documents on the deed
- The scanned attachment is present, legible, and complete
- The correct registration type has been selected

### Registration information to fill
- Unique registration number (assigned at this step per office SOP)
- Volume and folio reference (if applicable)
- Date of registration entry
- Instrument type (e.g. first registration, transfer, charge)
- Any notes or flags for the Registrar's attention

### Handling discrepancies
If any field does not match the title deed or is incomplete:
- Flag the specific field and state the nature of the discrepancy
- Mark the record as "Returned for Correction" with a written note
- The record is sent back to the Data Entry Officer for correction and re-submission
- On re-submission, the Reviewing Officer re-examines from the beginning of Step 2

### Completion
Before submitting to Step 3, confirm:
- All review checks passed
- Registration number assigned
- All registration fields completed
- No unresolved flags remain

---

## STEP 3 — REGISTRAR

### Role
The Registrar performs the final review of the complete record and, if satisfied, gives formal approval — officially registering the title in the system.

### Final review checks
- Steps 1 and 2 are both marked complete with no unresolved flags
- Registration number has been assigned
- Property and proprietorship information is consistent throughout the record
- The scanned title deed is attached and matches the entered data
- Any correction history is reviewed and resolved

### Approval actions
If the record is satisfactory:
- Approve the record — the title is officially registered
- The system records the Registrar's sign-off, date, and time
- The record becomes a completed, read-only registered title entry

If the record requires further action:
- Return the record with a written reason specifying which step requires correction
- The record re-enters the workflow at the step identified by the Registrar

---

## GENERAL ASSISTANT BEHAVIOUR

- Always identify which step the current officer is on and guide them through only that step.
- Proactively prompt for any missing or incomplete fields before the officer attempts to submit.
- Remind officers to cross-check entered data against the physical scanned deed before submission.
- Do not allow progression to the next step unless the current step's completion checklist is confirmed.
- Use plain, clear language. Avoid unnecessary jargon.
- If an edge case or unusual situation arises that is not covered by this workflow, advise the officer to pause and consult the Registrar directly before proceeding.

The officer currently logged in is: {officer_name} ({role_label}). Guide them through their step only."""


ROLE_LABELS = {
    'admin': 'Administrator / Registrar (Step 3)',
    'officer': 'Registration Officer (Step 1 — Data Entry)',
    'public': 'Public User',
}


class AssistantView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        messages = request.data.get('messages', [])
        if not messages:
            return Response({'error': 'messages required'}, status=400)

        api_key = os.environ.get('ANTHROPIC_API_KEY', '')
        if not api_key:
            return Response({'error': 'AI assistant is not configured.'}, status=503)

        # Determine officer role
        try:
            role = request.user.profile.role
        except Exception:
            role = 'officer'
        role_label = ROLE_LABELS.get(role, role)
        officer_name = request.user.get_full_name() or request.user.username

        system_prompt = ASSISTANT_SYSTEM_PROMPT.format(
            officer_name=officer_name,
            role_label=role_label,
        )

        client = anthropic.Anthropic(api_key=api_key)

        def stream_response():
            with client.messages.stream(
                model='claude-opus-4-6',
                max_tokens=1024,
                system=system_prompt,
                messages=messages,
            ) as stream:
                for text in stream.text_stream:
                    yield f"data: {json.dumps({'text': text})}\n\n"
            yield "data: [DONE]\n\n"

        response = StreamingHttpResponse(
            stream_response(),
            content_type='text/event-stream',
        )
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        return response

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MeView, StatsView,
    UserViewSet, LandParcelViewSet, ApplicationViewSet,
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'parcels', LandParcelViewSet, basename='parcel')
router.register(r'applications', ApplicationViewSet, basename='application')

urlpatterns = [
    path('me/', MeView.as_view(), name='me'),
    path('stats/', StatsView.as_view(), name='stats'),
    path('', include(router.urls)),
]

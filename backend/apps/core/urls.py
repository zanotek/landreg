from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MeView, StatsView,
    UserViewSet, OwnerViewSet, LandParcelViewSet, ApplicationViewSet, TitleDeedViewSet,
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'owners', OwnerViewSet, basename='owner')
router.register(r'parcels', LandParcelViewSet, basename='parcel')
router.register(r'applications', ApplicationViewSet, basename='application')
router.register(r'deeds', TitleDeedViewSet, basename='deed')

urlpatterns = [
    path('me/', MeView.as_view(), name='me'),
    path('stats/', StatsView.as_view(), name='stats'),
    path('', include(router.urls)),
]

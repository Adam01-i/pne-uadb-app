from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DossierReinscriptionViewSet, NotificationViewSet

router = DefaultRouter()
router.register(r'dossiers', DossierReinscriptionViewSet, basename='dossier')
router.register(r'notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    path('', include(router.urls)),
]

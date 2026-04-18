from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DossierReinscriptionViewSet, NotificationViewSet, certificat_inscription, creer_dossiers_classe

router = DefaultRouter()
router.register(r'dossiers', DossierReinscriptionViewSet, basename='dossier')
router.register(r'notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    path('certificat/', certificat_inscription),
    path('dossiers/creer-classe/', creer_dossiers_classe),
    path('', include(router.urls)),
]

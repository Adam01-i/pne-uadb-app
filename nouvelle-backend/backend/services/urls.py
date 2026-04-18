from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    VisiteMedicaleViewSet, ValidationBibliothequeViewSet, PaiementViewSet,
    CreneauVisiteViewSet,
    init_paiement, paytech_callback, statut_paiement,
)

router = DefaultRouter()
router.register(r'visites-medicales',        VisiteMedicaleViewSet,        basename='visite-medicale')
router.register(r'validations-bibliotheque', ValidationBibliothequeViewSet, basename='validation-bibliotheque')
router.register(r'paiements',                PaiementViewSet,               basename='paiement')
router.register(r'creneaux',                 CreneauVisiteViewSet,          basename='creneau')

urlpatterns = [
    path('', include(router.urls)),
    path('paytech/statut/',   statut_paiement),
    path('paytech/init/',     init_paiement),
    path('paytech/callback/', paytech_callback),
]
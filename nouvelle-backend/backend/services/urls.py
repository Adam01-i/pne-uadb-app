from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    VisiteMedicaleViewSet, ValidationBibliothequeViewSet, PaiementViewSet,
    PlanningVisiteMedicaleViewSet,
    init_paiement, paytech_callback, statut_paiement,
    etudiants_par_classe, classes_disponibles,
)

router = DefaultRouter()
router.register(r'visites-medicales',        VisiteMedicaleViewSet,           basename='visite-medicale')
router.register(r'validations-bibliotheque', ValidationBibliothequeViewSet,   basename='validation-bibliotheque')
router.register(r'paiements',                PaiementViewSet,                 basename='paiement')
router.register(r'plannings-visites',        PlanningVisiteMedicaleViewSet,   basename='planning-visite')

urlpatterns = [
    path('', include(router.urls)),
    path('paytech/statut/',       statut_paiement),
    path('paytech/init/',         init_paiement),
    path('paytech/callback/',     paytech_callback),
    path('etudiants-par-classe/', etudiants_par_classe),
    path('classes-disponibles/',  classes_disponibles),
]

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VisiteMedicaleViewSet, ValidationBibliothequeViewSet
from django.urls import path
from .views import init_paiement, paytech_callback

router = DefaultRouter()
router.register(r'visites-medicales',        VisiteMedicaleViewSet,        basename='visite-medicale')
router.register(r'validations-bibliotheque', ValidationBibliothequeViewSet, basename='validation-bibliotheque')

urlpatterns = [
    path('', include(router.urls)),
    path("paytech/init/", init_paiement),
    path("paytech/callback/", paytech_callback),
]
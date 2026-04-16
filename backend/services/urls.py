from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VisiteMedicaleViewSet, ValidationBibliothequeViewSet

router = DefaultRouter()
router.register(r'visites-medicales',        VisiteMedicaleViewSet,        basename='visite-medicale')
router.register(r'validations-bibliotheque', ValidationBibliothequeViewSet, basename='validation-bibliotheque')

urlpatterns = [
    path('', include(router.urls)),
]
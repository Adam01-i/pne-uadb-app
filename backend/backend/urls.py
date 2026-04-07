# pne-uadb-app/backend/backend/urls.py

from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from users.views import (
    EtudiantViewSet, ClasseViewSet,
    AgentScolariteViewSet, BibliothecaireViewSet, MedecinViewSet
)

router = DefaultRouter()
router.register(r'etudiants', EtudiantViewSet)
router.register(r'classes', ClasseViewSet)
router.register(r'agents', AgentScolariteViewSet)
router.register(r'bibliothecaires', BibliothecaireViewSet)
router.register(r'medecins', MedecinViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    # Endpoints JWT
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
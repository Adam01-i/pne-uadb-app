# pne-uadb-app/backend/backend/urls.py

from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from users.views import EtudiantViewSet, ClasseViewSet

router = DefaultRouter()
router.register(r'etudiants', EtudiantViewSet)
router.register(r'classes', ClasseViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
]
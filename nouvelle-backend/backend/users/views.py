# pne-uadb-app/backend/users/views.py

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q

from .models import Etudiant, Classe, AgentScolarite, Bibliothecaire, Medecin
from .serializers import (
    EtudiantSerializer, ClasseSerializer,
    AgentScolariteSerializer, BibliothecaireSerializer, MedecinSerializer
)
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from .permissions import IsAgent


class EtudiantPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100


class EtudiantViewSet(viewsets.ModelViewSet):
    serializer_class = EtudiantSerializer
    pagination_class = EtudiantPagination

    def get_queryset(self):
        user = self.request.user
        if user.role == 'etudiant':
            return Etudiant.objects.select_related('user', 'classe').filter(user=user)

        qs = Etudiant.objects.select_related('user', 'classe').all()

        search = self.request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(user__first_name__icontains=search) |
                Q(user__last_name__icontains=search) |
                Q(user__email__icontains=search) |
                Q(code_permanent__icontains=search) |
                Q(classe__filiere__icontains=search)
            )

        ufr = self.request.query_params.get('ufr', '').strip()
        departement = self.request.query_params.get('departement', '').strip()
        niveau = self.request.query_params.get('niveau', '').strip()
        if ufr:
            qs = qs.filter(classe__ufr__iexact=ufr)
        if departement:
            qs = qs.filter(classe__departement__iexact=departement)
        if niveau:
            qs = qs.filter(classe__niveau__iexact=niveau)

        return qs.order_by('user__last_name', 'user__first_name')

    def get_permissions(self):
        if self.action in ['create', 'update', 'destroy']:
            return [IsAgent()]
        return [IsAuthenticated()]

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role
        })

class ClasseViewSet(viewsets.ModelViewSet):
    queryset = Classe.objects.all()
    serializer_class = ClasseSerializer


class AgentScolariteViewSet(viewsets.ModelViewSet):
    queryset = AgentScolarite.objects.all()
    serializer_class = AgentScolariteSerializer


class BibliothecaireViewSet(viewsets.ModelViewSet):
    queryset = Bibliothecaire.objects.all()
    serializer_class = BibliothecaireSerializer


class MedecinViewSet(viewsets.ModelViewSet):
    queryset = Medecin.objects.all()
    serializer_class = MedecinSerializer
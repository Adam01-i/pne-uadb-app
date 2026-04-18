# pne-uadb-app/backend/users/views.py

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Etudiant, Classe, AgentScolarite, Bibliothecaire, Medecin
from .serializers import (
    EtudiantSerializer, ClasseSerializer,
    AgentScolariteSerializer, BibliothecaireSerializer, MedecinSerializer
)
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from .permissions import IsAgent

class EtudiantViewSet(viewsets.ModelViewSet):
    serializer_class = EtudiantSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'etudiant':
            return Etudiant.objects.filter(user=user)
        return Etudiant.objects.all()

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
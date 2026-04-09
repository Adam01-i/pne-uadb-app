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

class EtudiantViewSet(viewsets.ModelViewSet):
    serializer_class = EtudiantSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'etudiant':
            return Etudiant.objects.filter(user=user)
        return Etudiant.objects.all()

    @action(detail=False, methods=['get'])
    def me(self, request):
        etudiant = get_object_or_404(Etudiant, user=request.user)
        serializer = self.get_serializer(etudiant)
        return Response(serializer.data)

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
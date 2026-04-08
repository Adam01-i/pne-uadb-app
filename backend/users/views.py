# pne-uadb-app/backend/users/views.py

from rest_framework import viewsets
from .models import Etudiant, Classe, AgentScolarite, Bibliothecaire, Medecin
from .serializers import (
    EtudiantSerializer, ClasseSerializer,
    AgentScolariteSerializer, BibliothecaireSerializer, MedecinSerializer
)
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

class EtudiantViewSet(viewsets.ModelViewSet):
    queryset = Etudiant.objects.all()
    serializer_class = EtudiantSerializer

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
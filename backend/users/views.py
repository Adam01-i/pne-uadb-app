# pne-uadb-app/backend/users/views.py

from django.shortcuts import render

from rest_framework import viewsets
from .models import Etudiant, Classe
from .serializers import EtudiantSerializer, ClasseSerializer


class EtudiantViewSet(viewsets.ModelViewSet):
    queryset = Etudiant.objects.all()
    serializer_class = EtudiantSerializer


class ClasseViewSet(viewsets.ModelViewSet):
    queryset = Classe.objects.all()
    serializer_class = ClasseSerializer
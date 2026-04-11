from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import VisiteMedicale, ValidationBibliotheque
from .serializers import VisiteMedicaleSerializer, ValidationBibliothequeSerializer
from .permissions import IsMedecin, IsBibliothecaire


class VisiteMedicaleViewSet(viewsets.ModelViewSet):
    serializer_class = VisiteMedicaleSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsMedecin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and getattr(user, 'role', None) == 'etudiant':
            return VisiteMedicale.objects.filter(etudiant__user=user)
        return VisiteMedicale.objects.all()


class ValidationBibliothequeViewSet(viewsets.ModelViewSet):
    serializer_class = ValidationBibliothequeSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsBibliothecaire()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and getattr(user, 'role', None) == 'etudiant':
            return ValidationBibliotheque.objects.filter(etudiant__user=user)
        return ValidationBibliotheque.objects.all()

    @action(detail=True, methods=['patch'], url_path='valider')
    def valider(self, request, pk=None):
        validation = self.get_object()
        en_regle = request.data.get('en_regle')

        if en_regle is None:
            return Response(
                {'erreur': 'Le champ en_regle est requis.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        validation.en_regle = en_regle
        validation.save()

        message = 'Étudiant marqué en règle.' if en_regle else 'Étudiant marqué pas en règle.'
        return Response({'message': message}, status=status.HTTP_200_OK)
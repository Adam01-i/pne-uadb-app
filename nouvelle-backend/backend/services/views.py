from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from django.shortcuts import get_object_or_404

import uuid

from .models import VisiteMedicale, ValidationBibliotheque, Paiement, CreneauVisite
from .serializers import VisiteMedicaleSerializer, ValidationBibliothequeSerializer, PaiementSerializer, CreneauVisiteSerializer
from .permissions import IsMedecin, IsBibliothecaire
from users.models import Etudiant


# ==============================
# PAIEMENTS (liste)
# ==============================
class PaiementViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PaiementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'role', None) == 'etudiant':
            return Paiement.objects.filter(etudiant__user=user).order_by('-created_at')
        return Paiement.objects.all().order_by('-created_at')


# ==============================
# VISITE MEDICALE
# ==============================
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


# ==============================
# VALIDATION BIBLIOTHEQUE
# ==============================
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

        return Response({
            'message': 'Étudiant marqué en règle.' if en_regle else 'Étudiant marqué pas en règle.'
        }, status=status.HTTP_200_OK)


# ==============================
# STATUT PAIEMENT
# ==============================
@api_view(['GET'])
def statut_paiement(request):
    user = request.user
    if not user.is_authenticated:
        return Response({'error': 'Non authentifié.'}, status=401)
    try:
        etudiant = Etudiant.objects.get(user=user)
    except Etudiant.DoesNotExist:
        return Response({'paye': False})
    paiement = Paiement.objects.filter(etudiant=etudiant, status='success').first()
    if paiement:
        return Response({
            'paye': True,
            'montant': paiement.montant,
            'reference': paiement.reference,
            'method': paiement.method,
            'date': paiement.updated_at,
        })
    return Response({'paye': False})


# ==============================
# INIT PAIEMENT (simulation)
# ==============================
@api_view(['POST'])
def init_paiement(request):
    etudiant_id = request.data.get("etudiant_id")
    montant = request.data.get("montant")
    method = request.data.get("method", "orange_money")

    if not etudiant_id or not montant:
        return Response({"error": "champs requis"}, status=400)

    etudiant = get_object_or_404(Etudiant, id=etudiant_id)

    if Paiement.objects.filter(etudiant=etudiant, status='success').exists():
        return Response({"error": "Cet étudiant a déjà effectué son paiement."}, status=400)

    reference = str(uuid.uuid4())
    Paiement.objects.create(
        etudiant=etudiant,
        montant=montant,
        reference=reference,
        status="pending",
        method=method,
    )

    return Response({"ref_command": reference})


# ==============================
# CALLBACK PAIEMENT (simulation)
# ==============================
@api_view(['POST'])
@permission_classes([AllowAny])
def paytech_callback(request):
    ref = request.data.get("ref_command")
    status_pay = request.data.get("status", "").lower()

    paiement = get_object_or_404(Paiement, reference=ref)
    paiement.status = "success" if status_pay == "success" else "failed"
    paiement.save()

    return Response({"message": "OK"})


# ==============================
# CRENEAU VISITE
# ==============================
class CreneauVisiteViewSet(viewsets.ModelViewSet):
    serializer_class = CreneauVisiteSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsMedecin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = CreneauVisite.objects.all().order_by('-created_at')
        filiere = self.request.GET.get('filiere')
        niveau  = self.request.GET.get('niveau')
        if filiere:
            qs = qs.filter(filiere=filiere)
        if niveau:
            qs = qs.filter(niveau=niveau)
        return qs
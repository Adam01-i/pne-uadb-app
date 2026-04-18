from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from django.shortcuts import get_object_or_404

import uuid

from .models import VisiteMedicale, ValidationBibliotheque, Paiement, PlanningVisiteMedicale
from .serializers import (
    VisiteMedicaleSerializer, ValidationBibliothequeSerializer, PaiementSerializer,
    PlanningVisiteMedicaleSerializer,
)
from .permissions import IsMedecin, IsBibliothecaire
from users.models import Etudiant, Classe
from users.serializers import EtudiantSerializer, ClasseSerializer


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

    def _sync_dossier_visite(self, visite):
        from inscriptions.models import DossierReinscription
        try:
            dossier = DossierReinscription.objects.get(etudiant=visite.etudiant)
            dossier.statusVisite = 'VALIDE' if visite.aptitude else 'REJETE'
            dossier.save(update_fields=['statusVisite'])
        except DossierReinscription.DoesNotExist:
            pass

    def perform_create(self, serializer):
        visite = serializer.save()
        self._sync_dossier_visite(visite)

    def perform_update(self, serializer):
        visite = serializer.save()
        self._sync_dossier_visite(visite)


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

        # Synchroniser statusValidation sur le dossier
        from inscriptions.models import DossierReinscription
        try:
            dossier = validation.etudiant.dossier
            dossier.statusValidation = 'VALIDE' if en_regle else 'REJETE'
            dossier.save(update_fields=['statusValidation'])
        except DossierReinscription.DoesNotExist:
            pass

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

    # Synchroniser statusPaiement sur le dossier
    if paiement.status == 'success':
        from inscriptions.models import DossierReinscription
        try:
            dossier = paiement.etudiant.dossier
            dossier.statusPaiement = 'VALIDE'
            dossier.datePaiement = paiement.updated_at
            dossier.montant = paiement.montant
            dossier.operateur = paiement.method
            dossier.save(update_fields=['statusPaiement', 'datePaiement', 'montant', 'operateur'])
        except DossierReinscription.DoesNotExist:
            pass

    return Response({"message": "OK"})


# ==============================
# PLANNING VISITE MEDICALE
# ==============================
class PlanningVisiteMedicaleViewSet(viewsets.ModelViewSet):
    serializer_class = PlanningVisiteMedicaleSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsMedecin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        return PlanningVisiteMedicale.objects.prefetch_related('creneaux__etudiants__user').all()


# ==============================
# ÉTUDIANTS PAR CLASSE (filtrage)
# ==============================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def etudiants_par_classe(request):
    ufr = request.query_params.get('ufr', '').strip()
    departement = request.query_params.get('departement', '').strip()
    niveau = request.query_params.get('niveau', '').strip()
    code = request.query_params.get('code', '').strip()

    qs = Etudiant.objects.select_related('user', 'classe').all()
    if ufr:
        qs = qs.filter(classe__ufr__iexact=ufr)
    if departement:
        qs = qs.filter(classe__departement__iexact=departement)
    if niveau:
        qs = qs.filter(classe__niveau__iexact=niveau)
    if code:
        qs = qs.filter(code_permanent__icontains=code)

    qs = qs.order_by('user__last_name', 'user__first_name')
    return Response(EtudiantSerializer(qs, many=True).data)


# ==============================
# CLASSES DISPONIBLES (UFR + départements + niveaux)
# ==============================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def classes_disponibles(request):
    from inscriptions.models import DossierReinscription

    classes = Classe.objects.order_by('ufr', 'departement', 'niveau')

    # Pour le médecin et le bibliothécaire : uniquement les classes dont des dossiers ont été créés
    role = getattr(request.user, 'role', None)
    if role in ('medecin', 'biblio'):
        classes_avec_dossiers = (
            DossierReinscription.objects
            .values_list('etudiant__classe_id', flat=True)
            .distinct()
        )
        classes = classes.filter(id__in=classes_avec_dossiers)

    ufrs = sorted(set(classes.values_list('ufr', flat=True)))
    departements = sorted(set(classes.values_list('departement', flat=True)))
    niveaux = sorted(set(classes.values_list('niveau', flat=True)))
    return Response({
        'ufrs': ufrs,
        'departements': departements,
        'niveaux': niveaux,
        'classes': ClasseSerializer(classes, many=True).data,
    })

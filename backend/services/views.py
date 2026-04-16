from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from django.shortcuts import get_object_or_404
from django.conf import settings

import requests
import uuid

from .models import VisiteMedicale, ValidationBibliotheque, Paiement
from .serializers import VisiteMedicaleSerializer, ValidationBibliothequeSerializer
from .permissions import IsMedecin, IsBibliothecaire
from users.models import Etudiant


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
# INIT PAIEMENT PAYTECH
# ==============================
@api_view(['POST'])
def init_paiement(request):

    etudiant_id = request.data.get("etudiant_id")
    montant = request.data.get("montant")
    method = request.data.get("method", "orange_money")

    if not etudiant_id or not montant:
        return Response({"error": "champs requis"}, status=400)

    etudiant = get_object_or_404(Etudiant, id=etudiant_id)

    reference = str(uuid.uuid4())

    paiement = Paiement.objects.create(
        etudiant=etudiant,
        montant=montant,
        reference=reference,
        status="pending",
        method=method
    )

    base_url = "https://abbreviatedly-proabolition-sanford.ngrok-free.dev"

    payload = {
        "item_name": "Paiement inscription UADB",
        "item_price": int(montant),
        "ref_command": reference,
        "command_name": "Paiement UADB",
        "env": "test",
        "ipn_url": f"{base_url}/api/services/paytech/callback/",
        "success_url": f"{base_url}/success",
        "cancel_url": f"{base_url}/cancel",
    }

    headers = {
        "API_KEY": settings.PAYTECH_API_KEY,
        "API_SECRET": settings.PAYTECH_SECRET_KEY,
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(settings.PAYTECH_BASE_URL, json=payload, headers=headers)

        data = response.json()

        # 🔥 on sauvegarde le token PayTech
        if data.get("success") == 1:
            paiement.paytech_token = data.get("token")
            paiement.status = "processing"
            paiement.save()

        return Response(data)

    except Exception as e:
        paiement.status = "failed"
        paiement.save()
        return Response({"error": str(e)}, status=500)

# ==============================
# CALLBACK PAYTECH (IPN)
# ==============================
@api_view(['POST'])
def paytech_callback(request):

    ref = request.data.get("ref_command")
    status_pay = request.data.get("status", "").lower()

    paiement = get_object_or_404(Paiement, reference=ref)

    if status_pay == "success":
        paiement.status = "success"
    else:
        paiement.status = "failed"

    paiement.save()

    return Response({"message": "OK"})
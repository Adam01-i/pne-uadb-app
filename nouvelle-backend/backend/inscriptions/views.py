from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import HttpResponse

from .models import DossierReinscription, Notifications
from .serializers import DossierReinscriptionSerializer, NotificationSerializer
from users.models import Etudiant


class DossierReinscriptionViewSet(viewsets.ModelViewSet):
    serializer_class = DossierReinscriptionSerializer

    @staticmethod
    def _certificat_disponible(dossier):
        return (
            dossier.statusVisite == DossierReinscription.Statut.VALIDE
            and dossier.statusValidation == DossierReinscription.Statut.VALIDE
            and dossier.statusPaiement == DossierReinscription.Statut.VALIDE
        )

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'role', None) == 'etudiant':
            return DossierReinscription.objects.filter(etudiant__user=user)
        return DossierReinscription.objects.all()

    def get_permissions(self):
        return [IsAuthenticated()]

    @action(detail=True, methods=['get'], url_path='telecharger-certificat')
    def telecharger_certificat(self, request, pk=None):
        dossier = self.get_object()
        user = request.user

        if getattr(user, 'role', None) == 'etudiant' and dossier.etudiant.user_id != user.id:
            return Response(
                {'erreur': 'Accès refusé à ce certificat.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if not self._certificat_disponible(dossier):
            return Response(
                {'erreur': "Le certificat d'inscription n'est pas encore disponible."},
                status=status.HTTP_400_BAD_REQUEST
            )

        nom = dossier.etudiant.user.get_full_name().strip() or dossier.etudiant.user.username
        date_creation = dossier.dateCreation.strftime('%d/%m/%Y')
        date_paiement = dossier.datePaiement.strftime('%d/%m/%Y') if dossier.datePaiement else 'N/A'

        contenu = (
            "UNIVERSITE AMADOU DIOP DE BAMBEY\n"
            "CERTIFICAT D'INSCRIPTION\n\n"
            f"Nous certifions que l'etudiant(e) {nom} est inscrit(e) pour l'annee en cours.\n\n"
            f"Dossier: {dossier.idDossier}\n"
            f"Date de creation du dossier: {date_creation}\n"
            f"Date de paiement: {date_paiement}\n"
            f"Montant regle: {dossier.montant} FCFA\n\n"
            "Document genere automatiquement par la plateforme PNE."
        )

        response = HttpResponse(contenu, content_type='text/plain; charset=utf-8')
        response['Content-Disposition'] = (
            f'attachment; filename="certificat-inscription-{dossier.idDossier}.txt"'
        )
        return response

    @action(detail=True, methods=['patch'], url_path='statut')
    def update_statut(self, request, pk=None):
        dossier = self.get_object()
        user = request.user

        allowed_fields = []
        role = getattr(user, 'role', None)
        if role == 'medecin':
            allowed_fields = ['statusVisite']
        elif role == 'biblio':
            allowed_fields = ['statusValidation']
        elif role == 'agent':
            allowed_fields = ['statusPaiement', 'datePaiement', 'montant', 'operateur']

        data = {k: v for k, v in request.data.items() if k in allowed_fields}
        if not data:
            return Response(
                {'erreur': 'Aucun champ autorisé fourni.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = self.get_serializer(dossier, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'role', None) == 'etudiant':
            return Notifications.objects.filter(etudiant__user=user).order_by('-dateEnvoie')
        return Notifications.objects.all().order_by('-dateEnvoie')

    @action(detail=True, methods=['patch'], url_path='marquer-lu')
    def marquer_lu(self, request, pk=None):
        notif = self.get_object()
        notif.lu = True
        notif.save(update_fields=['lu'])
        return Response({'status': 'lu'})

    @action(detail=False, methods=['patch'], url_path='tout-marquer-lu')
    def tout_marquer_lu(self, request):
        self.get_queryset().filter(lu=False).update(lu=True)
        return Response({'status': 'ok'})

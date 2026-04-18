from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import DossierReinscription, Notifications
from .serializers import DossierReinscriptionSerializer, NotificationSerializer
from users.models import Etudiant


class DossierReinscriptionViewSet(viewsets.ModelViewSet):
    serializer_class = DossierReinscriptionSerializer

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'role', None) == 'etudiant':
            return DossierReinscription.objects.filter(etudiant__user=user)
        return DossierReinscription.objects.all()

    def get_permissions(self):
        return [IsAuthenticated()]

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

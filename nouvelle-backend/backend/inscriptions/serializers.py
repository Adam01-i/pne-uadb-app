from rest_framework import serializers
from .models import DossierReinscription, Notifications
from users.models import Etudiant


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notifications
        fields = ['idNotification', 'emetteur', 'message', 'dateEnvoie', 'lu', 'etudiant']
        read_only_fields = ['idNotification', 'dateEnvoie']


class DossierReinscriptionSerializer(serializers.ModelSerializer):
    etudiant_nom = serializers.CharField(
        source='etudiant.user.get_full_name', read_only=True
    )
    notifications = NotificationSerializer(many=True, read_only=True)

    etudiant_id = serializers.PrimaryKeyRelatedField(
        queryset=Etudiant.objects.all(),
        source='etudiant',
        write_only=True
    )

    class Meta:
        model = DossierReinscription
        fields = [
            'idDossier',
            'dateCreation',
            'statusVisite',
            'statusValidation',
            'statusPaiement',
            'datePaiement',
            'montant',
            'operateur',
            'etudiant_nom',
            'etudiant_id',
            'notifications',
        ]
        read_only_fields = ['idDossier', 'dateCreation']

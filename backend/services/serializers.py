from rest_framework import serializers
from .models import VisiteMedicale, ValidationBibliotheque
from users.models import Etudiant, Medecin, Bibliothecaire


# ==============================
# Visite Médicale
# ==============================
class VisiteMedicaleSerializer(serializers.ModelSerializer):
    # Lecture : afficher les infos complètes
    etudiant_nom = serializers.CharField(source='etudiant.user.get_full_name', read_only=True)
    medecin_nom  = serializers.CharField(source='medecin.user.get_full_name',  read_only=True)

    # Écriture : on passe juste les IDs
    etudiant_id = serializers.PrimaryKeyRelatedField(
        queryset=Etudiant.objects.all(),
        source='etudiant',
        write_only=True
    )
    medecin_id = serializers.PrimaryKeyRelatedField(
        queryset=Medecin.objects.all(),
        source='medecin',
        write_only=True
    )

    class Meta:
        model  = VisiteMedicale
        fields = [
            'id',
            'etudiant_nom', 'etudiant_id',
            'medecin_nom',  'medecin_id',
            'date_visite',
            'resultat',
            'aptitude',
        ]


# ==============================
# Validation Bibliothèque
# ==============================
class ValidationBibliothequeSerializer(serializers.ModelSerializer):
    # Lecture
    etudiant_nom       = serializers.CharField(source='etudiant.user.get_full_name',      read_only=True)
    bibliothecaire_nom = serializers.CharField(source='bibliothecaire.user.get_full_name', read_only=True)

    # Écriture
    etudiant_id = serializers.PrimaryKeyRelatedField(
        queryset=Etudiant.objects.all(),
        source='etudiant',
        write_only=True
    )
    bibliothecaire_id = serializers.PrimaryKeyRelatedField(
        queryset=Bibliothecaire.objects.all(),
        source='bibliothecaire',
        write_only=True
    )

    class Meta:
        model  = ValidationBibliotheque
        fields = [
            'id',
            'etudiant_nom',       'etudiant_id',
            'bibliothecaire_nom', 'bibliothecaire_id',
            'date_validation',
            'en_regle',
        ]
from rest_framework import serializers
from .models import VisiteMedicale, ValidationBibliotheque, Paiement, PlanningVisiteMedicale, CreneauVisite
from users.models import Etudiant, Medecin, Bibliothecaire, Classe
from users.serializers import EtudiantSerializer


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


# ==============================
# Paiement
# ==============================
class PaiementSerializer(serializers.ModelSerializer):
    etudiant_nom = serializers.CharField(source='etudiant.user.get_full_name', read_only=True)
    etudiant_code = serializers.CharField(source='etudiant.code_permanent', read_only=True)
    etudiant_classe = serializers.CharField(source='etudiant.classe.filiere', read_only=True)

    class Meta:
        model = Paiement
        fields = [
            'id',
            'etudiant_nom', 'etudiant_code', 'etudiant_classe',
            'montant', 'reference', 'status', 'method',
            'created_at', 'updated_at',
        ]


# ==============================
# Créneau Visite
# ==============================
class CreneauVisiteSerializer(serializers.ModelSerializer):
    etudiant_ids = serializers.PrimaryKeyRelatedField(
        queryset=Etudiant.objects.all(),
        source='etudiants',
        many=True,
        write_only=True,
    )
    etudiants = EtudiantSerializer(many=True, read_only=True)

    class Meta:
        model = CreneauVisite
        fields = ['id', 'numero_groupe', 'date', 'heure_debut', 'heure_fin', 'etudiant_ids', 'etudiants']


# ==============================
# Planning Visite Médicale
# ==============================
class PlanningVisiteMedicaleSerializer(serializers.ModelSerializer):
    medecin_id = serializers.PrimaryKeyRelatedField(
        queryset=Medecin.objects.all(),
        source='medecin',
        write_only=True,
    )
    classe_id = serializers.PrimaryKeyRelatedField(
        queryset=Classe.objects.all(),
        source='classe',
        write_only=True,
    )
    medecin_nom = serializers.CharField(source='medecin.user.get_full_name', read_only=True)
    classe_info = serializers.SerializerMethodField(read_only=True)
    creneaux = CreneauVisiteSerializer(many=True)
    created_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = PlanningVisiteMedicale
        fields = ['id', 'medecin_id', 'medecin_nom', 'classe_id', 'classe_info', 'creneaux', 'created_at']

    def get_classe_info(self, obj):
        c = obj.classe
        return f"{c.ufr} – {c.filiere} {c.niveau}"

    def create(self, validated_data):
        from inscriptions.models import Notifications
        creneaux_data = validated_data.pop('creneaux')
        planning = PlanningVisiteMedicale.objects.create(**validated_data)
        medecin_nom = planning.medecin.user.get_full_name()

        for creneau_data in creneaux_data:
            etudiants = creneau_data.pop('etudiants')
            creneau = CreneauVisite.objects.create(planning=planning, **creneau_data)
            creneau.etudiants.set(etudiants)

            for etudiant in etudiants:
                Notifications.objects.create(
                    emetteur=f"Dr. {medecin_nom}",
                    message=(
                        f"Vous êtes convoqué(e) pour une visite médicale.\n"
                        f"Groupe {creneau.numero_groupe} – {creneau.date.strftime('%d/%m/%Y')} "
                        f"de {creneau.heure_debut.strftime('%H:%M')} à {creneau.heure_fin.strftime('%H:%M')}."
                    ),
                    etudiant=etudiant,
                )

        return planning
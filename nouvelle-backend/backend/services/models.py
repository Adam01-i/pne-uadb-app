from django.db import models
from users.models import Etudiant, Medecin, Bibliothecaire

# ==============================
# Visite Médicale
# ==============================
class VisiteMedicale(models.Model):
    etudiant    = models.ForeignKey(Etudiant, on_delete=models.CASCADE, related_name='visites_medicales')
    medecin     = models.ForeignKey(Medecin,  on_delete=models.CASCADE, related_name='visites')
    date_visite = models.DateTimeField(auto_now_add=True)
    resultat    = models.TextField(blank=True)
    aptitude    = models.BooleanField(default=False)

    def __str__(self):
        return f"Visite de {self.etudiant} - Aptitude: {self.aptitude}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        from inscriptions.models import DossierReinscription, Notifications
        
        # 1. Mise à jour du Dossier
        dossier, _ = DossierReinscription.objects.get_or_create(etudiant=self.etudiant)
        dossier.statusVisite = DossierReinscription.Statut.VALIDE if self.aptitude else DossierReinscription.Statut.REJETE
        dossier.save()
        
        # 2. Envoi de la notification
        msg = "Votre visite médicale a été validée." if self.aptitude else "Votre visite médicale a été rejetée."
        Notifications.objects.create(
            destinataire=self.etudiant.user, # <--- Changé: on cible le user de l'étudiant
            emetteur="MEDECIN",
            message=msg,
            type_cible="INDIVIDUEL" # Optionnel: pour ton suivi
        )

# ==============================
# Validation Bibliothèque
# ==============================
class ValidationBibliotheque(models.Model):
    etudiant        = models.ForeignKey(Etudiant, on_delete=models.CASCADE, related_name='validations_bibliotheque')
    bibliothecaire  = models.ForeignKey(Bibliothecaire, on_delete=models.CASCADE, related_name='validations')
    date_validation = models.DateTimeField(auto_now_add=True)
    en_regle        = models.BooleanField(default=False)

    def __str__(self):
        return f"Bibliothèque {self.etudiant} - En règle: {self.en_regle}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        from inscriptions.models import DossierReinscription, Notifications
        
        # 1. Mise à jour du Dossier
        dossier, _ = DossierReinscription.objects.get_or_create(etudiant=self.etudiant)
        dossier.statusValidation = DossierReinscription.Statut.VALIDE if self.en_regle else DossierReinscription.Statut.REJETE
        dossier.save()
        
        # 2. Envoi de la notification
        Notifications.objects.create(
            destinataire=self.etudiant.user, # <--- Changé: on cible le user de l'étudiant
            emetteur="BIBLIOTHECAIRE",
            message="Le quitus de bibliothèque a été traité.",
            type_cible="INDIVIDUEL"
        )

      # ==============================
# Paiement
# ==============================
class Paiement(models.Model):
    CHOIX_DE_STATUT = [
        ("en attente", "En attente"),
        ("traitement", "Traitement"),
        ("succès", "Succès"),
        ("échoué", "Échoué"),
    ]
    # Correction : Pas d'espaces dans les noms de variables (CHOIX_DE_METHODES)
    CHOIX_DE_METHODES = [
        ("orange_money", "Orange Money"),
        ("wave", "Wave"),
        ("carte", "Carte"),
        ("inconnu", "Inconnu"),
    ]

    # Utilise les termes techniques Django (ForeignKey, IntegerField, etc.)
    etudiant = models.ForeignKey(Etudiant, on_delete=models.CASCADE)
    montant = models.IntegerField()
    reference = models.CharField(max_length=100, unique=True)
    status = models.CharField(max_length=20, choices=CHOIX_DE_STATUT, default="en attente")
    methode = models.CharField(max_length=20, choices=CHOIX_DE_METHODES, default="inconnu")
    paytech_token = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.reference} - {self.status}"
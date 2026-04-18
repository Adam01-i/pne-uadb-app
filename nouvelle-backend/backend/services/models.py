from django.db import models
from users.models import Etudiant, Medecin, Bibliothecaire, Classe


# ==============================
# Visite Médicale
# ==============================
class VisiteMedicale(models.Model):
    etudiant    = models.ForeignKey(Etudiant, on_delete=models.CASCADE, related_name='visites_medicales')
    medecin     = models.ForeignKey(Medecin,  on_delete=models.CASCADE, related_name='visites')
    date_visite = models.DateTimeField()
    resultat    = models.TextField(blank=True)
    aptitude    = models.BooleanField(default=False)

    def __str__(self):
        return f"Visite de {self.etudiant} le {self.date_visite}"


# ==============================
# Validation Bibliothèque
# ==============================
class ValidationBibliotheque(models.Model):
    etudiant        = models.ForeignKey(Etudiant,       on_delete=models.CASCADE, related_name='validations_bibliotheque')
    bibliothecaire  = models.ForeignKey(Bibliothecaire, on_delete=models.CASCADE, related_name='validations')
    date_validation = models.DateTimeField(auto_now_add=True)
    en_regle        = models.BooleanField(default=False)

    def __str__(self):
        return f"Validation bibliothèque de {self.etudiant} - {'En règle' if self.en_regle else 'Pas en règle'}"
    
# ==============================
# Paiement
# ==============================
class Paiement(models.Model):

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("processing", "Processing"),
        ("success", "Success"),
        ("failed", "Failed"),
    ]

    METHOD_CHOICES = [
        ("orange_money", "Orange Money"),
        ("wave", "Wave"),
        ("card", "Card"),
        ("unknown", "Unknown"),
    ]

    etudiant = models.ForeignKey("users.Etudiant", on_delete=models.CASCADE)

    montant = models.IntegerField()
    reference = models.CharField(max_length=100, unique=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    method = models.CharField(max_length=20, choices=METHOD_CHOICES, default="unknown")

    paytech_token = models.CharField(max_length=255, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.reference} - {self.status}"


# ==============================
# Planning Visite Médicale
# ==============================
class PlanningVisiteMedicale(models.Model):
    medecin = models.ForeignKey(Medecin, on_delete=models.CASCADE, related_name='plannings')
    classe = models.ForeignKey(Classe, on_delete=models.CASCADE, related_name='plannings_visites')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Planning visite – {self.classe} (Dr. {self.medecin})"


class CreneauVisite(models.Model):
    planning = models.ForeignKey(PlanningVisiteMedicale, on_delete=models.CASCADE, related_name='creneaux')
    numero_groupe = models.PositiveIntegerField()
    date = models.DateField()
    heure_debut = models.TimeField()
    heure_fin = models.TimeField()
    etudiants = models.ManyToManyField(Etudiant, related_name='creneaux_visites', blank=True)

    class Meta:
        ordering = ['numero_groupe']

    def __str__(self):
        return f"Groupe {self.numero_groupe} – {self.date} {self.heure_debut}-{self.heure_fin}"
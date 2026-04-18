from django.db import models
from users.models import Etudiant
from django.contrib.auth import get_user_model

CustomUser = get_user_model()

class DossierReinscription(models.Model):
    # Correspond à l'Enum Statut de ton diagramme
    class Statut(models.TextChoices):
        ATTENTE = 'EN_ATTENTE', 'En attente'
        VALIDE = 'VALIDE', 'Validé'
        REJETE = 'REJETE', 'Rejeté'

    idDossier = models.AutoField(primary_key=True)
    dateCreation = models.DateTimeField(auto_now_add=True)
    
    # Les statuts de validation
    statusVisite = models.CharField(max_length=20, choices=Statut.choices, default=Statut.ATTENTE)
    statusValidation = models.CharField(max_length=20, choices=Statut.choices, default=Statut.ATTENTE)
    statusPaiement = models.CharField(max_length=20, choices=Statut.choices, default=Statut.ATTENTE)
    
    # Informations financières
    datePaiement = models.DateTimeField(null=True, blank=True)
    montant = models.FloatField(default=0.0)
    operateur = models.CharField(max_length=50, blank=True)
    
    # Relation 1..1 avec Etudiant (Une réinscription par étudiant)
    etudiant = models.OneToOneField(Etudiant, on_delete=models.CASCADE, related_name='dossier')

    def __str__(self):
        return f"Dossier {self.idDossier} - {self.etudiant}"

class Notifications(models.Model):
    idNotification = models.AutoField(primary_key=True)
    emetteur = models.CharField(max_length=100)
    message = models.TextField()
    dateEnvoie = models.DateTimeField(auto_now_add=True)
    lu = models.BooleanField(default=False)

    # Destinataire étudiant (nullable — mutuellement exclusif avec destinataire)
    etudiant = models.ForeignKey(
        Etudiant, on_delete=models.CASCADE,
        related_name='notifications', null=True, blank=True,
    )
    # Destinataire staff (médecin, bibliothécaire, agent…)
    destinataire = models.ForeignKey(
        CustomUser, on_delete=models.CASCADE,
        related_name='notifications_recues', null=True, blank=True,
    )
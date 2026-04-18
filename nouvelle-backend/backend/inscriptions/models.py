from django.db import models
from users.models import Etudiant,CustomUser # On importe l'Etudiant de la Personne 1

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

"""class Notifications(models.Model):
    idNotification = models.AutoField(primary_key=True)
    emetteur = models.CharField(max_length=100)
    message = models.TextField()
    dateEnvoie = models.DateTimeField(auto_now_add=True)
    lu = models.BooleanField(default=False)

    # Relation 0..* (Un étudiant peut avoir plusieurs notifications)
    etudiant = models.ForeignKey(Etudiant, on_delete=models.CASCADE, related_name='notifications')"""

# pne-uadb-app/backend/inscriptions/models.py




class Notifications(models.Model):
    TYPE_CIBLE_CHOICES = [
        ('ROLE', 'Par rôle'),
        ('CLASSE', 'Par classe académique'),
        ('INDIVIDUEL', 'Utilisateur spécifique'),
    ]

    # Retour aux anciens noms
    idNotification = models.AutoField(primary_key=True)
    emetteur = models.CharField(max_length=100) 
    message = models.TextField()
    dateEnvoie = models.DateTimeField(auto_now_add=True) # Nom d'origine
    lu = models.BooleanField(default=False)

    destinataire = models.ForeignKey(
        'users.CustomUser', 
        on_delete=models.CASCADE, 
        related_name='notifications',
        null=True, 
        blank=True
    )

    type_cible = models.CharField(max_length=20, choices=TYPE_CIBLE_CHOICES)

    # Champs de filtres
    filtre_ufr = models.CharField(max_length=100, blank=True)
    filtre_departement = models.CharField(max_length=100, blank=True)
    filtre_filiere = models.CharField(max_length=100, blank=True)
    filtre_niveau = models.CharField(max_length=50, blank=True)
    filtre_annee = models.CharField(max_length=20, blank=True)
    filtre_role = models.CharField(max_length=50, blank=True)

    def __str__(self):
        dest = self.destinataire.username if self.destinataire else self.type_cible
        return f"[{self.type_cible}] {self.emetteur} -> {dest}"
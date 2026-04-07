# pne-uadb-app/backend/users/models.py

from django.db import models
from django.contrib.auth.models import AbstractUser


# ==============================
# Classe (niveau académique)
# ==============================
class Classe(models.Model):
    ufr = models.CharField(max_length=100)
    departement = models.CharField(max_length=100)
    filiere = models.CharField(max_length=100)
    niveau = models.CharField(max_length=50)
    annee_academique = models.CharField(max_length=20)

    def __str__(self):
        return f"{self.filiere} - {self.niveau} ({self.annee_academique})"


# ==============================
# Custom User
# ==============================
class CustomUser(AbstractUser):
    ROLE_CHOICES = [
        ('etudiant', 'Etudiant'),
        ('agent', 'Agent Scolarité'),
        ('biblio', 'Bibliothécaire'),
        ('medecin', 'Médecin'),
    ]

    # On garde username + password de Django
    email = models.EmailField(unique=True)

    # Infos supplémentaires
    adresse = models.CharField(max_length=200, blank=True)
    telephone = models.CharField(max_length=20, blank=True)

    # Rôle utilisateur
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)

    def __str__(self):
        return f"{self.username} ({self.role})"


# ==============================
# Étudiant (profil)
# ==============================
class Etudiant(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='etudiant')
    code_permanent = models.CharField(max_length=50)
    classe = models.ForeignKey(Classe, on_delete=models.CASCADE)

    def __str__(self):
        return f"{self.user.get_full_name()} - {self.code_permanent}"


# ==============================
# Agent de scolarité (profil)
# ==============================
class AgentScolarite(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='agent')
    bureau = models.CharField(max_length=100)

    def __str__(self):
        return f"Agent: {self.user.get_full_name()}"


# ==============================
# Bibliothécaire (profil)
# ==============================
class Bibliothecaire(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='bibliothecaire')
    numero_employe = models.CharField(max_length=50)

    def __str__(self):
        return f"Bibliothécaire: {self.user.get_full_name()}"


# ==============================
# Médecin (profil)
# ==============================
class Medecin(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='medecin')
    specialite = models.CharField(max_length=100)

    def __str__(self):
        return f"Médecin: {self.user.get_full_name()}"
from django.db import models
from users.models import Etudiant, Medecin, Bibliothecaire


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
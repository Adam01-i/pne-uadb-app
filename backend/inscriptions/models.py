from django.db import models
from users.models import Etudiant 
from users.models import Medecin
from users.models import Bibliothecaire

"""
class Statut(models.TextChoices):
    EN_ATTENTE = 'EN_ATTENTE', 'En attente'
    VALIDE = 'VALIDE', 'Validé'
    REJETE = 'REJETE', 'Rejeté'

class DossierReinscription(models.Model):
    idDossier = models.AutoField(primary_key=True)
    dateCreation = models.DateTimeField(auto_now_add=True)
    
    statusVisite = models.CharField(max_length=20, choices=Statut.choices, default=Statut.EN_ATTENTE)
    statusValidation = models.CharField(max_length=20, choices=Statut.choices, default=Statut.EN_ATTENTE)
    statusPaiement = models.CharField(max_length=20, choices=Statut.choices, default=Statut.EN_ATTENTE)
    
    montant = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    datePaiement = models.DateTimeField(null=True, blank=True)
    operateur = models.CharField(max_length=50, blank=True) 
    
    etudiant = models.OneToOneField(Etudiant, on_delete=models.CASCADE, related_name='dossier')

    def __str__(self):
        return f"Dossier {self.idDossier} - {self.etudiant}"

class VisiteMedicale(models.Model):
    # On pointe directement vers le modèle Medecin
    medecin = models.ForeignKey(
        Medecin, 
        on_delete=models.CASCADE, 
        related_name='visites_medicales'
    )
    etudiant = models.ForeignKey(
        Etudiant, 
        on_delete=models.CASCADE, 
        related_name='visites_medicales'
    )
    dateVisite = models.DateTimeField(auto_now_add=True)
    resultat = models.TextField()
    aptitude = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # On remonte au dossier via l'étudiant
        dossier = DossierReinscription.objects.filter(etudiant=self.etudiant).last()
        if dossier:
            dossier.statusVisite = Statut.EN_ATTENTE # On utilise tes constantes
            if self.aptitude:
                dossier.statusVisite = Statut.VALIDE
            else:
                dossier.statusVisite = Statut.REJETE
            dossier.save()

class ValidationBibliotheque(models.Model):
    # On pointe directement vers le modèle Bibliothecaire
    bibliothecaire = models.ForeignKey(
        Bibliothecaire, 
        on_delete=models.CASCADE, 
        related_name='validations_biblio'
    )
    etudiant = models.ForeignKey(
        Etudiant, 
        on_delete=models.CASCADE, 
        related_name='validations_biblio'
    )
    dateValidation = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        dossier = DossierReinscription.objects.filter(etudiant=self.etudiant).last()
        if dossier:
            dossier.statusValidation = Statut.VALIDE
            dossier.save()

class Notifications(models.Model):
    # Restriction de l'émetteur aux 3 rôles autorisés
    class EmetteurChoix(models.TextChoices):
        SCOLARITE = 'AGENT_SCOLARITE', 'Agent Scolarité'
        MEDECIN = 'MEDECIN', 'Médecin'
        BIBLIOTHECAIRE = 'BIBLIOTHECAIRE', 'Bibliothécaire'

    idNotification = models.AutoField(primary_key=True)
    emetteur = models.CharField(
        max_length=20, 
        choices=EmetteurChoix.choices, 
        default=EmetteurChoix.SCOLARITE
    )
    message = models.TextField()
    dateEnvoie = models.DateTimeField(auto_now_add=True)
    etudiant = models.ForeignKey(Etudiant, on_delete=models.CASCADE, related_name='notifications')

    def __str__(self):
        return f"Notif de {self.get_emetteur_display()} pour {self.etudiant}"
        """
from django.db import models
from users.models import Etudiant, Medecin, Bibliothecaire 

class Statut(models.TextChoices):
    EN_ATTENTE = 'EN_ATTENTE', 'En attente'
    VALIDE = 'VALIDE', 'Validé'
    REJETE = 'REJETE', 'Rejeté'

class DossierReinscription(models.Model):
    idDossier = models.AutoField(primary_key=True)
    dateCreation = models.DateTimeField(auto_now_add=True)
    statusVisite = models.CharField(max_length=20, choices=Statut.choices, default=Statut.EN_ATTENTE)
    statusValidation = models.CharField(max_length=20, choices=Statut.choices, default=Statut.EN_ATTENTE)
    statusPaiement = models.CharField(max_length=20, choices=Statut.choices, default=Statut.EN_ATTENTE)
    montant = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    datePaiement = models.DateTimeField(null=True, blank=True)
    operateur = models.CharField(max_length=50, blank=True) 
    etudiant = models.OneToOneField(Etudiant, on_delete=models.CASCADE, related_name='dossier')

    def __str__(self):
        return f"Dossier {self.idDossier} - {self.etudiant}"

class VisiteMedicale(models.Model):
    medecin = models.ForeignKey(Medecin, on_delete=models.CASCADE, related_name='visites_medicales')
    etudiant = models.ForeignKey(Etudiant, on_delete=models.CASCADE, related_name='visites_medicales')
    dateVisite = models.DateTimeField(auto_now_add=True)
    resultat = models.TextField()
    aptitude = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # 1. Mise à jour du dossier
        dossier, created = DossierReinscription.objects.get_or_create(etudiant=self.etudiant)
        dossier.statusVisite = Statut.VALIDE if self.aptitude else Statut.REJETE
        dossier.save()
        
        # 2. Enregistrement de la notification
        msg = "Votre visite médicale a été validée." if self.aptitude else "Votre visite médicale a été rejetée."
        Notifications.objects.create(
            etudiant=self.etudiant,
            emetteur=Notifications.EmetteurChoix.MEDECIN,
            message=msg
        )

class ValidationBibliotheque(models.Model):
    bibliothecaire = models.ForeignKey(Bibliothecaire, on_delete=models.CASCADE, related_name='validations_biblio')
    etudiant = models.ForeignKey(Etudiant, on_delete=models.CASCADE, related_name='validations_biblio')
    dateValidation = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        dossier, created = DossierReinscription.objects.get_or_create(etudiant=self.etudiant)
        dossier.statusValidation = Statut.VALIDE
        dossier.save()
        
        Notifications.objects.create(
            etudiant=self.etudiant,
            emetteur=Notifications.EmetteurChoix.BIBLIOTHECAIRE,
            message="Quitus de bibliothèque validé."
        )

class Notifications(models.Model):
    class EmetteurChoix(models.TextChoices):
        SCOLARITE = 'AGENT_SCOLARITE', 'Agent Scolarité'
        MEDECIN = 'MEDECIN', 'Médecin'
        BIBLIOTHECAIRE = 'BIBLIOTHECAIRE', 'Bibliothécaire'

    idNotification = models.AutoField(primary_key=True)
    emetteur = models.CharField(max_length=20, choices=EmetteurChoix.choices, default=EmetteurChoix.SCOLARITE)
    message = models.TextField()
    dateEnvoie = models.DateTimeField(auto_now_add=True)
    etudiant = models.ForeignKey(Etudiant, on_delete=models.CASCADE, related_name='notifications')

    def __str__(self):
        return f"Notif de {self.get_emetteur_display()} pour {self.etudiant}"
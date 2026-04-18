from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import VisiteMedicale, ValidationBibliotheque, Paiement
from inscriptions.models import DossierReinscription


@receiver(post_save, sender=VisiteMedicale)
def sync_status_visite(sender, instance, **kwargs):
    try:
        dossier = DossierReinscription.objects.get(etudiant=instance.etudiant)
        nouveau_statut = 'VALIDE' if instance.aptitude else 'REJETE'
        if dossier.statusVisite != nouveau_statut:
            dossier.statusVisite = nouveau_statut
            dossier.save(update_fields=['statusVisite'])
    except DossierReinscription.DoesNotExist:
        pass


@receiver(post_save, sender=ValidationBibliotheque)
def sync_status_validation(sender, instance, **kwargs):
    try:
        dossier = DossierReinscription.objects.get(etudiant=instance.etudiant)
        nouveau_statut = 'VALIDE' if instance.en_regle else 'REJETE'
        if dossier.statusValidation != nouveau_statut:
            dossier.statusValidation = nouveau_statut
            dossier.save(update_fields=['statusValidation'])
    except DossierReinscription.DoesNotExist:
        pass


@receiver(post_save, sender=Paiement)
def sync_status_paiement(sender, instance, **kwargs):
    if instance.status != 'success':
        return
    try:
        dossier = DossierReinscription.objects.get(etudiant=instance.etudiant)
        if dossier.statusPaiement != 'VALIDE':
            dossier.statusPaiement = 'VALIDE'
            dossier.save(update_fields=['statusPaiement'])
    except DossierReinscription.DoesNotExist:
        pass

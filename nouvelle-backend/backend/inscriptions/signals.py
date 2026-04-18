from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import DossierReinscription, Notifications


@receiver(post_save, sender=DossierReinscription)
def notifier_dossier_complet(sender, instance, **kwargs):
    if (
        instance.statusVisite == 'VALIDE'
        and instance.statusValidation == 'VALIDE'
        and instance.statusPaiement == 'VALIDE'
    ):
        # Évite la duplication si la notif existe déjà
        deja = Notifications.objects.filter(
            etudiant=instance.etudiant,
            emetteur='Système',
            message__icontains='dossier complet',
        ).exists()
        if not deja:
            Notifications.objects.create(
                etudiant=instance.etudiant,
                emetteur='Système',
                message=(
                    'Félicitations ! Votre dossier de réinscription est complet et validé. '
                    'Visite médicale, validation bibliothèque et paiement ont tous été confirmés.'
                ),
            )

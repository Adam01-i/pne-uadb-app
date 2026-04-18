
from django.contrib import admin
from .models import (
    DossierReinscription, 
    Notifications)

@admin.register(DossierReinscription)
class DossierAdmin(admin.ModelAdmin):
    # Ici, on met TOUS les attributs de ton diagramme de classe
    list_display = (
        'idDossier', 
        'etudiant', 
        'dateCreation', 
        'statusVisite', 
        'statusValidation', 
        'statusPaiement', 
        'montant', 
        'operateur'
    )
    # On ajoute des filtres sur le côté pour gagner du temps
    list_filter = ('statusVisite', 'statusValidation', 'statusPaiement', 'operateur')
    # On permet de chercher un étudiant par son nom ou son dossier
    search_fields = ('etudiant__user__nom', 'idDossier')



@admin.register(Notifications)
class NotificationsAdmin(admin.ModelAdmin):
    # On utilise les noms "CamelCase" d'origine
    list_display = (
        'idNotification', 
        'emetteur', 
        'destinataire', 
        'type_cible', 
        'dateEnvoie', 
        'lu'
    )
    
    # Filtres latéraux basés sur les anciens noms
    list_filter = ('type_cible', 'lu', 'dateEnvoie')
    
    # Barre de recherche (destinataire__username permet de chercher par le nom d'utilisateur du lien ForeignKey)
    search_fields = ('message', 'emetteur', 'destinataire__username', 'destinataire__email')
    
    # Tri par défaut (les plus récentes en premier)
    ordering = ('-dateEnvoie',)
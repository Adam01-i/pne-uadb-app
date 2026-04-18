from django.contrib import admin
from .models import VisiteMedicale, ValidationBibliotheque, Paiement

@admin.register(VisiteMedicale)
class VisiteAdmin(admin.ModelAdmin):
    # Correction : on utilise date_visite au lieu de dateVisite
    list_display = ('etudiant', 'medecin', 'aptitude', 'date_visite')
    list_filter = ('aptitude', 'date_visite')

@admin.register(ValidationBibliotheque)
class BiblioAdmin(admin.ModelAdmin):
    # Correction : on utilise date_validation au lieu de dateValidation
    list_display = ('etudiant', 'bibliothecaire', 'date_validation', 'en_regle')
    list_filter = ('en_regle', 'date_validation')

# backend/services/admin.py

@admin.register(Paiement)
class PaiementAdmin(admin.ModelAdmin):
    # On utilise 'status' et 'methode' (avec un 'e') 
    # pour correspondre exactement à ton modèle corrigé
    list_display = ('reference', 'etudiant', 'montant', 'status', 'created_at')
    list_filter = ('status', 'methode') # <--- CORRECTION ICI : 'method' devient 'methode'
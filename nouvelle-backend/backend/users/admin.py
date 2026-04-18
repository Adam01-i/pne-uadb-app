from django.contrib import admin
from .models import CustomUser, Classe, Etudiant, AgentScolarite, Bibliothecaire, Medecin

# Configuration pour CustomUser
@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'role', 'is_staff', 'date_joined')
    list_filter = ('role', 'is_staff', 'is_active')
    search_fields = ('username', 'email')
    ordering = ('-date_joined',)

# Configuration pour Classe
@admin.register(Classe)
class ClasseAdmin(admin.ModelAdmin):
    list_display = ('filiere', 'niveau', 'departement', 'annee_academique')
    list_filter = ('filiere', 'niveau', 'annee_academique')
    search_fields = ('filiere', 'departement')

# Configuration pour Etudiant
@admin.register(Etudiant)
class EtudiantAdmin(admin.ModelAdmin):
    list_display = ('get_name', 'code_permanent', 'get_classe')
    search_fields = ('user__last_name', 'user__first_name', 'code_permanent')
    list_filter = ('classe__filiere', 'classe__niveau')

    # Méthodes pour afficher les informations liées proprement
    def get_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}"
    get_name.short_description = 'Nom Complet'

    def get_classe(self, obj):
        return f"{obj.classe.filiere} ({obj.classe.niveau})"
    get_classe.short_description = 'Classe'

# Configuration pour les profils métiers (Scolarité, Biblio, Médecin)
@admin.register(AgentScolarite)
class AgentAdmin(admin.ModelAdmin):
    # Affiche le nom, l'email et le téléphone depuis le CustomUser lié
    list_display = ('get_full_name', 'get_email', 'get_phone')
    search_fields = ('user__first_name', 'user__last_name', 'user__email')

    def get_full_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}"
    get_full_name.short_description = 'Nom Complet'

    def get_email(self, obj):
        return obj.user.email
    get_email.short_description = 'Email'

    def get_phone(self, obj):
        return obj.user.telephone
    get_phone.short_description = 'Téléphone'

@admin.register(Bibliothecaire)
class BiblioAdmin(admin.ModelAdmin):
    list_display = ('get_full_name', 'get_email', 'get_phone')
    search_fields = ('user__first_name', 'user__last_name', 'user__email')

    def get_full_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}"
    get_full_name.short_description = 'Nom Complet'

    def get_email(self, obj):
        return obj.user.email
    get_email.short_description = 'Email'

    def get_phone(self, obj):
        return obj.user.telephone
    get_phone.short_description = 'Téléphone'

@admin.register(Medecin)
class MedecinAdmin(admin.ModelAdmin):
    list_display = ('get_full_name', 'get_email', 'get_phone')
    search_fields = ('user__first_name', 'user__last_name', 'user__email')

    def get_full_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}"
    get_full_name.short_description = 'Nom Complet'

    def get_email(self, obj):
        return obj.user.email
    get_email.short_description = 'Email'

    def get_phone(self, obj):
        return obj.user.telephone
    get_phone.short_description = 'Téléphone'
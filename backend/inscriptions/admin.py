from django.contrib import admin
# On importe tes modèles depuis le fichier models.py du même dossier
from .models import DossierReinscription, Notifications

# On les enregistre pour qu'ils soient visibles dans l'interface
admin.site.register(DossierReinscription)
admin.site.register(Notifications)
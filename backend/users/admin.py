# pne-uadb-app/backend/users/admin.py

from django.contrib import admin
from .models import *

admin.site.register(CustomUser)
admin.site.register(Classe)
admin.site.register(Etudiant)
admin.site.register(AgentScolarite)
admin.site.register(Bibliothecaire)
admin.site.register(Medecin)
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.db import models  # <--- TRÈS IMPORTANT
from .models import DossierReinscription, Notifications
from .serializers import DossierReinscriptionSerializer, NotificationSerializer
from users.models import Classe, Etudiant

User = get_user_model()

# ==========================================
# GESTION DES DOSSIERS DE REINSCRIPTION
# ==========================================
class DossierReinscriptionViewSet(viewsets.ModelViewSet):
    serializer_class = DossierReinscriptionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Un étudiant ne voit que son propre dossier
        if getattr(user, 'role', None) == 'etudiant':
            return DossierReinscription.objects.filter(etudiant__user=user)
        # Les agents/médecins/biblio voient tout
        return DossierReinscription.objects.all()

    @action(detail=True, methods=['patch'], url_path='statut')
    def update_statut(self, request, pk=None):
        """Permet aux différents acteurs de valider une étape du dossier"""
        dossier = self.get_object()
        user = request.user
        allowed_fields = []
        role = getattr(user, 'role', None)
        
        # Filtrage des champs modifiables selon le rôle
        if role == 'medecin':
            allowed_fields = ['statusVisite']
        elif role == 'biblio':
            allowed_fields = ['statusValidation']
        elif role == 'agent':
            allowed_fields = ['statusPaiement', 'datePaiement', 'montant', 'operateur']

        data = {k: v for k, v in request.data.items() if k in allowed_fields}
        if not data:
            return Response({'erreur': 'Aucun champ autorisé fourni pour votre rôle.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(dossier, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)



# Assure-toi d'importer tes modèles
# from .models import Notifications, User, Etudiant, Classe 

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notifications.objects.filter(destinataire=self.request.user).order_by('-dateEnvoie')

    # --- NOUVELLE ACTION POUR LES OPTIONS DE CLASSE ---
    @action(detail=False, methods=['get'], url_path='options-classes')
    def get_classes_options(self, request):
        """Récupère les options uniques depuis la table Classe pour le front"""
        classes = Classe.objects.all()
        data = {
            'ufrs': list(classes.values_list('ufr', flat=True).distinct()),
            'departements': list(classes.values_list('departement', flat=True).distinct()),
            'filieres': list(classes.values_list('filiere', flat=True).distinct()),
            'niveaux': list(classes.values_list('niveau', flat=True).distinct()),
            'annees': list(classes.values_list('annee_academique', flat=True).distinct()),
        }
        return Response(data)

    @action(detail=False, methods=['post'], url_path='diffuser')
    def diffuser(self, request):
        """Logique de diffusion massive"""
        if getattr(request.user, 'role', None) != 'agent':
            return Response({'error': 'Seuls les agents peuvent diffuser.'}, status=403)

        data = request.data
        type_cible = data.get('type_cible')
        message = data.get('message', '').strip()

        if not message:
            return Response({'error': 'Message vide.'}, status=400)

        users_to_notify = []
        filtres_notif = {}

        # 1. Ciblage de la population
        if type_cible == 'TOUS':
            users_to_notify = User.objects.all()
        
        elif type_cible == 'ROLE':
            role_cible = data.get('valeur')
            users_to_notify = User.objects.filter(role=role_cible)
            filtres_notif['filtre_role'] = role_cible

        elif type_cible == 'CLASSE':
            f = data.get('filtre', {})
            # Filtrage dynamique basé sur les champs de la table Classe
            etudiants_qs = Etudiant.objects.all()
            
            if f.get('ufr'):
                etudiants_qs = etudiants_qs.filter(classe__ufr=f['ufr'])
            if f.get('departement'):
                etudiants_qs = etudiants_qs.filter(classe__departement=f['departement'])
            if f.get('filiere'): 
                etudiants_qs = etudiants_qs.filter(classe__filiere=f['filiere'])
            if f.get('niveau'): 
                etudiants_qs = etudiants_qs.filter(classe__niveau=f['niveau'])
            if f.get('annee_academique'):
                etudiants_qs = etudiants_qs.filter(classe__annee_academique=f['annee_academique'])
            
            user_ids = etudiants_qs.values_list('user_id', flat=True)
            users_to_notify = User.objects.filter(id__in=user_ids)
            
            # On stocke les filières/niveaux pour historique dans la notif
            filtres_notif.update({
                'filtre_filiere': f.get('filiere', 'Toutes'),
                'filtre_niveau': f.get('niveau', 'Tous')
            })

        elif type_cible == 'INDIVIDUEL':
            valeurs = data.get('valeur', [])
            if isinstance(valeurs, str): valeurs = [valeurs]
            
            ids_num = [v for v in valeurs if str(v).isdigit()]
            users_to_notify = User.objects.filter(
                models.Q(id__in=ids_num) | 
                models.Q(email__in=valeurs) | 
                models.Q(username__in=valeurs)
            ).distinct()

        # 2. Envoi (Bulk create)
        role_map = {'agent': 'Agent Scolarité', 'medecin': 'Service Médical', 'biblio': 'Bibliothèque'}
        appellation = role_map.get(request.user.role, "Administration")
        
        notifications_objs = [
            Notifications(
                destinataire=u,
                message=message,
                emetteur=appellation,
                type_cible=type_cible,
                **filtres_notif
            ) for u in users_to_notify
        ]

        if notifications_objs:
            Notifications.objects.bulk_create(notifications_objs)
            return Response({'sent': len(notifications_objs)}, status=status.HTTP_201_CREATED)
        return Response({'error': 'Aucun destinataire trouvé.'}, status=404)

    @action(detail=True, methods=['patch'], url_path='marquer-lu')
    def marquer_lu(self, request, pk=None):
        notif = self.get_object()
        notif.lu = True
        notif.save(update_fields=['lu'])
        return Response({'status': 'lu'})

    @action(detail=False, methods=['patch'], url_path='tout-marquer-lu')
    def tout_marquer_lu(self, request):
        self.get_queryset().filter(lu=False).update(lu=True)
        return Response({'status': 'ok'})
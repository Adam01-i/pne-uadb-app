import io
from datetime import date

from django.http import HttpResponse
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import DossierReinscription, Notifications
from .serializers import DossierReinscriptionSerializer, NotificationSerializer
from users.models import Etudiant


class DossierReinscriptionViewSet(viewsets.ModelViewSet):
    serializer_class = DossierReinscriptionSerializer

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'role', None) == 'etudiant':
            return DossierReinscription.objects.filter(etudiant__user=user)
        return DossierReinscription.objects.all()

    def get_permissions(self):
        return [IsAuthenticated()]

    @action(detail=True, methods=['patch'], url_path='statut')
    def update_statut(self, request, pk=None):
        dossier = self.get_object()
        user = request.user

        allowed_fields = []
        role = getattr(user, 'role', None)
        if role == 'medecin':
            allowed_fields = ['statusVisite']
        elif role == 'biblio':
            allowed_fields = ['statusValidation']
        elif role == 'agent':
            allowed_fields = ['statusPaiement', 'datePaiement', 'montant', 'operateur']

        data = {k: v for k, v in request.data.items() if k in allowed_fields}
        if not data:
            return Response(
                {'erreur': 'Aucun champ autorisé fourni.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = self.get_serializer(dossier, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        role = getattr(user, 'role', None)
        if role == 'etudiant':
            return Notifications.objects.filter(etudiant__user=user).order_by('-dateEnvoie')
        # médecin, bibliothécaire, agent : notifications adressées directement à leur compte
        return Notifications.objects.filter(destinataire=user).order_by('-dateEnvoie')

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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def certificat_inscription(request):
    user = request.user
    try:
        etudiant = Etudiant.objects.select_related('user', 'classe').get(user=user)
    except Etudiant.DoesNotExist:
        return Response({'erreur': 'Profil étudiant introuvable.'}, status=403)

    try:
        dossier = DossierReinscription.objects.get(etudiant=etudiant)
    except DossierReinscription.DoesNotExist:
        return Response({'erreur': 'Aucun dossier de réinscription.'}, status=404)

    if not (dossier.statusVisite == 'VALIDE'
            and dossier.statusValidation == 'VALIDE'
            and dossier.statusPaiement == 'VALIDE'):
        return Response(
            {'erreur': 'Le certificat n\'est disponible que lorsque toutes les étapes sont validées.'},
            status=403,
        )

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2.5 * cm,
        leftMargin=2.5 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()
    c_center = ParagraphStyle('c_center', parent=styles['Normal'], alignment=TA_CENTER, fontSize=10)
    c_right  = ParagraphStyle('c_right',  parent=styles['Normal'], alignment=TA_RIGHT,  fontSize=9, textColor=colors.grey)
    titre    = ParagraphStyle('titre',    parent=styles['Normal'], alignment=TA_CENTER, fontSize=16, fontName='Helvetica-Bold', spaceAfter=6)
    sous_titre = ParagraphStyle('sous_titre', parent=styles['Normal'], alignment=TA_CENTER, fontSize=12, textColor=colors.HexColor('#3B3B98'), spaceAfter=4)
    label_style = ParagraphStyle('label', parent=styles['Normal'], fontSize=10, fontName='Helvetica-Bold')
    value_style = ParagraphStyle('value', parent=styles['Normal'], fontSize=10)
    small_center = ParagraphStyle('small_center', parent=styles['Normal'], alignment=TA_CENTER, fontSize=9, textColor=colors.grey)

    classe = etudiant.classe
    nom_complet = etudiant.user.get_full_name() or etudiant.user.username
    annee = classe.annee_academique

    story = []

    # En-tête université
    story.append(Paragraph('UNIVERSITÉ ALIOUNE DIOP DE BAMBEY', titre))
    story.append(Paragraph('République du Sénégal', c_center))
    story.append(Paragraph('Un Peuple – Un But – Une Foi', c_center))
    story.append(Spacer(1, 0.4 * cm))
    story.append(HRFlowable(width='100%', thickness=2, color=colors.HexColor('#3B3B98')))
    story.append(Spacer(1, 0.6 * cm))

    # Titre du document
    story.append(Paragraph('CERTIFICAT D\'INSCRIPTION', sous_titre))
    story.append(Paragraph(f'Année Académique {annee}', c_center))
    story.append(Spacer(1, 0.8 * cm))

    # Corps – informations étudiant
    data = [
        [Paragraph('Nom et Prénom :', label_style),    Paragraph(nom_complet, value_style)],
        [Paragraph('Code Permanent :', label_style),   Paragraph(etudiant.code_permanent, value_style)],
        [Paragraph('UFR :', label_style),              Paragraph(classe.ufr, value_style)],
        [Paragraph('Département :', label_style),      Paragraph(classe.departement, value_style)],
        [Paragraph('Filière :', label_style),          Paragraph(classe.filiere, value_style)],
        [Paragraph('Niveau :', label_style),           Paragraph(classe.niveau, value_style)],
        [Paragraph('Année Académique :', label_style), Paragraph(annee, value_style)],
    ]

    table = Table(data, colWidths=[5.5 * cm, 11 * cm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#EEF2FF')),
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.white, colors.HexColor('#F8F9FF')]),
        ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#CCCCDD')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(table)
    story.append(Spacer(1, 0.8 * cm))

    # Attestation
    texte_attestation = (
        f'Le Président de l\'Université Alioune Diop de Bambey atteste que '
        f'<b>{nom_complet}</b>, titulaire du code permanent <b>{etudiant.code_permanent}</b>, '
        f'est régulièrement inscrit(e) en <b>{classe.filiere} – {classe.niveau}</b> '
        f'au sein de l\'<b>UFR {classe.ufr}</b> pour l\'année académique <b>{annee}</b>.'
    )
    story.append(Paragraph(texte_attestation, ParagraphStyle(
        'attest', parent=styles['Normal'], fontSize=11, leading=18,
        alignment=TA_LEFT, borderPad=10,
    )))
    story.append(Spacer(1, 1.2 * cm))

    # Signatures
    sig_data = [
        [Paragraph('Bambey, le ' + date.today().strftime('%d/%m/%Y'), value_style), ''],
        ['', Paragraph('Le Président de l\'Université', c_center)],
        [Paragraph('Cachet et signature de l\'étudiant(e)', small_center), Paragraph('Signature', c_center)],
    ]
    sig_table = Table(sig_data, colWidths=[8 * cm, 8 * cm])
    sig_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(sig_table)
    story.append(Spacer(1, 1 * cm))

    # Pied de page
    story.append(HRFlowable(width='100%', thickness=0.5, color=colors.grey))
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph(
        'Document généré électroniquement via la Plateforme Numérique d\'Enregistrement (PNE) – UADB',
        small_center,
    ))

    doc.build(story)
    buffer.seek(0)

    nom_fichier = f"certificat_inscription_{etudiant.code_permanent}_{annee.replace('-', '_')}.pdf"
    response = HttpResponse(buffer, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{nom_fichier}"'
    return response


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def creer_dossiers_classe(request):
    if getattr(request.user, 'role', None) != 'agent':
        return Response({'erreur': 'Réservé aux agents de scolarité.'}, status=403)

    from users.models import Classe, Medecin, Bibliothecaire

    ufr         = request.data.get('ufr', '').strip()
    departement = request.data.get('departement', '').strip()
    niveau      = request.data.get('niveau', '').strip()

    if not (ufr and departement and niveau):
        return Response({'erreur': 'ufr, departement et niveau sont requis.'}, status=400)

    try:
        classe = Classe.objects.get(ufr=ufr, departement=departement, niveau=niveau)
    except Classe.DoesNotExist:
        return Response({'erreur': 'Classe introuvable.'}, status=404)
    except Classe.MultipleObjectsReturned:
        # S'il y a plusieurs filières pour ce triplet, prendre la première
        classe = Classe.objects.filter(ufr=ufr, departement=departement, niveau=niveau).first()

    etudiants = Etudiant.objects.filter(classe=classe).select_related('user')
    if not etudiants.exists():
        return Response({'erreur': 'Aucun étudiant dans cette classe.'}, status=404)

    crees = 0
    ignores = 0
    for etudiant in etudiants:
        _, created = DossierReinscription.objects.get_or_create(etudiant=etudiant)
        if created:
            crees += 1
        else:
            ignores += 1

    # Notifications aux médecins
    medecins = Medecin.objects.select_related('user').all()
    for medecin in medecins:
        Notifications.objects.create(
            emetteur='Agent Scolarité',
            message=(
                f"La classe {ufr} – {departement} – {niveau} ({crees} dossier(s) créé(s)) "
                f"est prête pour les visites médicales. Veuillez planifier les créneaux."
            ),
            destinataire=medecin.user,
        )

    # Notifications aux bibliothécaires
    bibliothecaires = Bibliothecaire.objects.select_related('user').all()
    for biblio in bibliothecaires:
        Notifications.objects.create(
            emetteur='Agent Scolarité',
            message=(
                f"La classe {ufr} – {departement} – {niveau} ({crees} dossier(s) créé(s)) "
                f"est prête pour les validations bibliothèque."
            ),
            destinataire=biblio.user,
        )

    return Response({
        'crees': crees,
        'ignores': ignores,
        'total_etudiants': etudiants.count(),
    }, status=201)

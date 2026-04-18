import random
from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password
from users.models import CustomUser, Etudiant, Classe

# ─── Données nominales sénégalaises ───────────────────────────────────────────

PRENOMS_M = [
    'Ibrahima', 'Moussa', 'Mamadou', 'Abdoulaye', 'Cheikh', 'Ousmane', 'Modou',
    'Aliou', 'Babacar', 'Lamine', 'Serigne', 'Mbaye', 'Pape', 'Djiby', 'Malick',
    'Saliou', 'Amath', 'Biram', 'Idrissa', 'Ousseynou', 'Thierno', 'Elhadji',
    'Ndiouga', 'Assane', 'Boubacar', 'Tidiane', 'Omar', 'Ismaila', 'Daouda',
    'Seydou', 'Mor', 'Khalil', 'Habib', 'Ngor', 'Ablaye', 'Demba', 'Gorgui',
]

PRENOMS_F = [
    'Fatou', 'Aissatou', 'Mariama', 'Aminata', 'Rokhaya', 'Ndéye', 'Coumba',
    'Khady', 'Adja', 'Binta', 'Seynabou', 'Sokhna', 'Diary', 'Mame', 'Yacine',
    'Awa', 'Salimata', 'Bineta', 'Dieynaba', 'Fatoumata', 'Astou', 'Ramata',
    'Oumou', 'Nabou', 'Codou', 'Maty', 'Ndeye Marie', 'Sophie', 'Clarisse',
    'Angele', 'Hawa', 'Kadiatou', 'Zeinab', 'Marème', 'Kiné',
]

NOMS = [
    'Diallo', 'Diop', 'Ndiaye', 'Sow', 'Fall', 'Gueye', 'Mbaye', 'Sarr', 'Faye',
    'Ba', 'Sy', 'Cissé', 'Thiam', 'Kane', 'Diouf', 'Ndoye', 'Thiaw', 'Mané',
    'Dème', 'Badji', 'Diatta', 'Tendeng', 'Sambou', 'Goudiaby', 'Diedhiou',
    'Sène', 'Ndiong', 'Ndong', 'Ciss', 'Camara', 'Konaté', 'Touré', 'Kouyaté',
    'Balde', 'Barry', 'Sidibé', 'Keïta', 'Traoré', 'Coulibaly', 'Dramé',
    'Dasylva', 'Manga', 'Daffé', 'Niasse', 'Tall', 'Lô', 'Ngom', 'Sané',
    'Bodian', 'Mendy', 'Dioussé', 'Diassy', 'Faty', 'Coly', 'Tendeng',
]

# ─── Nombre d'étudiants par niveau ────────────────────────────────────────────

NB_PAR_NIVEAU = {
    'L1': 30, 'L2': 25, 'L3': 20,
    'M1': 15, 'M2': 12,
    'D1': 10, 'D2': 8, 'D3': 6,
}
NB_DEFAULT = 12

# Décalage niveau → années depuis l'entrée en L1
OFFSET_NIVEAU = {
    'L1': 0, 'L2': 1, 'L3': 2,
    'M1': 3, 'M2': 4,
    'D1': 5, 'D2': 6, 'D3': 7,
}


def _num_promo(niveau: str, annee_academique: str) -> int:
    """Retourne les 2 derniers chiffres de l'année d'entrée à l'université."""
    annee_base = int(annee_academique[:4])
    offset = OFFSET_NIVEAU.get(niveau, 0)
    return (annee_base - offset) % 100


def _code_permanent(promo: int, seq: int) -> str:
    """Format : {promo:02d}{seq:05d} = 7 chiffres. Ex: 2400001"""
    return f"{promo:02d}{seq:05d}"


class Command(BaseCommand):
    help = "Génère des étudiants sénégalais pour chaque classe de l'UADB"

    def add_arguments(self, parser):
        parser.add_argument('--reset', action='store_true',
                            help='Supprime tous les étudiants existants avant génération')

    def handle(self, *args, **options):
        if options['reset']:
            count = Etudiant.objects.count()
            # Supprimer les users associés (cascade)
            CustomUser.objects.filter(role='etudiant').delete()
            self.stdout.write(self.style.WARNING(f'{count} étudiant(s) supprimé(s).'))

        classes = Classe.objects.all().order_by('ufr', 'departement', 'niveau')
        total_crees = 0
        mdp_hash = make_password('etudiant123')

        # Compteurs par numéro de promo pour garantir l'unicité des codes
        seq_par_promo: dict[int, int] = {}

        for classe in classes:
            nb = NB_PAR_NIVEAU.get(classe.niveau, NB_DEFAULT)
            promo = _num_promo(classe.niveau, classe.annee_academique)

            if promo not in seq_par_promo:
                # Reprendre après le dernier code existant pour cette promo
                existant = (
                    Etudiant.objects
                    .filter(code_permanent__startswith=f"{promo:02d}")
                    .values_list('code_permanent', flat=True)
                )
                if existant:
                    seq_par_promo[promo] = max(int(c[2:]) for c in existant if c[2:].isdigit()) + 1
                else:
                    seq_par_promo[promo] = 1

            for _ in range(nb):
                sexe = random.choice(['M', 'F'])
                prenom = random.choice(PRENOMS_M if sexe == 'M' else PRENOMS_F)
                nom = random.choice(NOMS)

                seq = seq_par_promo[promo]
                code = _code_permanent(promo, seq)

                nom_clean = nom.lower().replace(' ', '').replace('é','e').replace('è','e').replace('ê','e').replace('ï','i')
                username = f"{prenom[0].lower()}{nom_clean}{seq}"
                email = f"{username}@uadb.edu.sn"

                if CustomUser.objects.filter(email=email).exists() or \
                   CustomUser.objects.filter(username=username).exists():
                    seq_par_promo[promo] += 1
                    continue

                user = CustomUser(
                    username=username,
                    first_name=prenom,
                    last_name=nom,
                    email=email,
                    role='etudiant',
                    password=mdp_hash,
                )
                user.save()

                Etudiant.objects.create(
                    user=user,
                    code_permanent=code,
                    classe=classe,
                )

                seq_par_promo[promo] += 1
                total_crees += 1

        self.stdout.write(self.style.SUCCESS(
            f'\nTerminé : {total_crees} étudiant(s) créé(s) sur {classes.count()} classes.'
        ))
        self.stdout.write(f'Mot de passe commun pour les tests : etudiant123')

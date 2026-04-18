from django.core.management.base import BaseCommand
from users.models import Classe

ANNEE = "2024-2025"

CLASSES = [
    # ─── SATIC ────────────────────────────────────────────────────────────────
    # Informatique et TIC
    *[{"ufr": "SATIC", "departement": "Informatique et TIC",
       "filiere": "Développement et Administration d'Applications Web (D2AW)", "niveau": n}
      for n in ["L1", "L2", "L3", "M1", "M2"]],

    *[{"ufr": "SATIC", "departement": "Informatique et TIC",
       "filiere": "Systèmes, Réseaux et Télécommunications (SRT)", "niveau": n}
      for n in ["L1", "L2", "L3", "M1", "M2"]],

    *[{"ufr": "SATIC", "departement": "Informatique et TIC",
       "filiere": "Création Multimédia", "niveau": n}
      for n in ["L1", "L2", "L3", "M1", "M2"]],

    # Mathématiques
    *[{"ufr": "SATIC", "departement": "Mathématiques",
       "filiere": "Mathématiques", "niveau": n}
      for n in ["L1", "L2", "L3", "M1", "M2"]],

    *[{"ufr": "SATIC", "departement": "Mathématiques",
       "filiere": "Statistique et Informatique Décisionnelle", "niveau": n}
      for n in ["L1", "L2", "L3", "M1", "M2"]],

    # Physique et Chimie
    *[{"ufr": "SATIC", "departement": "Physique et Chimie",
       "filiere": "Physique et Chimie", "niveau": n}
      for n in ["L1", "L2", "L3"]],

    *[{"ufr": "SATIC", "departement": "Physique et Chimie",
       "filiere": "Chimie Appliquée", "niveau": n}
      for n in ["L1", "L2", "L3", "M1", "M2"]],

    *[{"ufr": "SATIC", "departement": "Physique et Chimie",
       "filiere": "Énergies Renouvelables", "niveau": n}
      for n in ["M1", "M2"]],

    # ─── SDD ──────────────────────────────────────────────────────────────────
    # Santé communautaire
    *[{"ufr": "SDD", "departement": "Santé communautaire",
       "filiere": "Santé communautaire", "niveau": n}
      for n in ["L1", "L2", "L3", "M1", "M2"]],

    # Médecine
    *[{"ufr": "SDD", "departement": "Médecine",
       "filiere": "Médecine", "niveau": n}
      for n in ["L1", "L2", "L3", "M1", "M2", "D1", "D2", "D3"]],

    # Développement durable
    *[{"ufr": "SDD", "departement": "Développement durable",
       "filiere": "Ingénierie technique du Développement durable", "niveau": n}
      for n in ["L1", "L2", "L3"]],

    # ─── ECOMIJ ───────────────────────────────────────────────────────────────
    # Économie et Management
    *[{"ufr": "ECOMIJ", "departement": "Économie et Management",
       "filiere": "Sciences Économiques et de Gestion", "niveau": n}
      for n in ["L1", "L2", "L3", "M1", "M2"]],

    *[{"ufr": "ECOMIJ", "departement": "Économie et Management",
       "filiere": "Management des organisations territoriales", "niveau": n}
      for n in ["M1", "M2"]],

    # Ingénierie Juridique
    *[{"ufr": "ECOMIJ", "departement": "Ingénierie Juridique",
       "filiere": "Droit Privé – Droit des Affaires", "niveau": n}
      for n in ["L1", "L2", "L3", "M1", "M2"]],

    *[{"ufr": "ECOMIJ", "departement": "Ingénierie Juridique",
       "filiere": "Droit Privé – Cyberdroit et commerce électronique", "niveau": n}
      for n in ["M1", "M2"]],

    *[{"ufr": "ECOMIJ", "departement": "Ingénierie Juridique",
       "filiere": "Droit Public – Administration Publique", "niveau": n}
      for n in ["L1", "L2", "L3", "M1", "M2"]],

    *[{"ufr": "ECOMIJ", "departement": "Ingénierie Juridique",
       "filiere": "Droit Public – Management Foncier et environnemental", "niveau": n}
      for n in ["M1", "M2"]],
]


class Command(BaseCommand):
    help = "Peuple la table Classe avec les filières officielles de l'UADB"

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Supprime toutes les classes existantes avant insertion",
        )

    def handle(self, *args, **options):
        if options["reset"]:
            deleted, _ = Classe.objects.all().delete()
            self.stdout.write(self.style.WARNING(f"{deleted} classe(s) supprimée(s)."))

        created = 0
        skipped = 0
        for c in CLASSES:
            _, is_new = Classe.objects.get_or_create(
                ufr=c["ufr"],
                departement=c["departement"],
                filiere=c["filiere"],
                niveau=c["niveau"],
                defaults={"annee_academique": ANNEE},
            )
            if is_new:
                created += 1
            else:
                skipped += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Terminé : {created} classe(s) créée(s), {skipped} déjà existante(s)."
            )
        )

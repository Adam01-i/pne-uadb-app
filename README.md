# PNE-UADB — Plateforme Nationale d'Enregistrement

Application web de gestion des membres de la communauté universitaire de l'**Université Alioune Diop de Bambey (UADB)**. Elle centralise la gestion des étudiants, agents de scolarité, bibliothécaires et médecins avec un système d'authentification basé sur des rôles.

---

## Sommaire

- [Architecture](#architecture)
- [Technologies](#technologies)
- [Prérequis](#prérequis)
- [Installation](#installation)
  - [Backend (Django)](#backend-django)
  - [Frontend (Next.js)](#frontend-nextjs)
- [Variables d'environnement](#variables-denvironnement)
- [Structure du projet](#structure-du-projet)
- [API — Endpoints](#api--endpoints)
- [Rôles et permissions](#rôles-et-permissions)
- [Authentification JWT](#authentification-jwt)

---

## Architecture

```
pne-uadb-app/
├── backend/      # API REST — Django 6 + DRF + JWT
└── frontend/     # Interface web — Next.js 15 + Tailwind CSS
```

Le frontend communique avec le backend via une API REST sécurisée par des tokens JWT. Les deux services tournent indépendamment :

- **Backend** : `http://localhost:8000`
- **Frontend** : `http://localhost:3000`

---

## Technologies

### Backend
| Outil | Version | Rôle |
|---|---|---|
| Python | 3.x | Langage |
| Django | 6.0 | Framework web |
| Django REST Framework | 3.17 | API REST |
| djangorestframework-simplejwt | 5.5 | Authentification JWT |
| django-cors-headers | 4.7 | Gestion CORS |
| PostgreSQL | — | Base de données |

### Frontend
| Outil | Version | Rôle |
|---|---|---|
| Next.js | 15.3 | Framework React (App Router) |
| React | 19 | UI |
| TypeScript | 5.7 | Typage statique |
| Tailwind CSS | 3.4 | Styles |

---

## Prérequis

- Python 3.10+
- Node.js 18+
- PostgreSQL (en cours d'exécution)
- npm ou yarn

---

## Installation

### Backend (Django)

**1. Cloner le dépôt et se placer dans le dossier backend**

```bash
cd backend
```

**2. Créer et activer un environnement virtuel**

```bash
python -m venv venv
source venv/bin/activate        # Linux / macOS
# venv\Scripts\activate         # Windows
```

**3. Installer les dépendances**

```bash
pip install django djangorestframework djangorestframework-simplejwt django-cors-headers python-dotenv
```

> Les autres packages dans `requirements.txt` sont des dépendances système Ubuntu — seuls ceux listés ci-dessus sont nécessaires pour le projet.

**4. Créer la base de données PostgreSQL**

```sql
CREATE DATABASE pne_db;
CREATE USER pne_user WITH PASSWORD 'password123';
GRANT ALL PRIVILEGES ON DATABASE pne_db TO pne_user;
```

**5. Appliquer les migrations**

```bash
python manage.py migrate
```

**6. Créer un superutilisateur (admin Django)**

```bash
python manage.py createsuperuser
```

**7. Lancer le serveur**

```bash
python manage.py runserver
```

L'API est accessible sur `http://localhost:8000`.

---

### Frontend (Next.js)

**1. Se placer dans le dossier frontend**

```bash
cd frontend
```

**2. Installer les dépendances**

```bash
npm install
```

**3. Configurer les variables d'environnement**

Créer un fichier `.env.local` à la racine du dossier `frontend/` :

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**4. Lancer le serveur de développement**

```bash
npm run dev
```

L'interface est accessible sur `http://localhost:3000`.

---

## Variables d'environnement

### Frontend (`frontend/.env.local`)

| Variable | Valeur par défaut | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | URL de base de l'API backend |

### Backend (`backend/backend/settings.py`)

> En développement, les paramètres sont directement dans `settings.py`. En production, utiliser des variables d'environnement via `python-dotenv`.

| Paramètre | Valeur par défaut |
|---|---|
| `SECRET_KEY` | clé de développement (à changer en prod) |
| `DB NAME` | `pne_db` |
| `DB USER` | `pne_user` |
| `DB PASSWORD` | `password123` |
| `DB HOST` | `localhost` |
| `DB PORT` | `5432` |

---

## Structure du projet

```
backend/
├── backend/
│   ├── settings.py       # Configuration Django
│   ├── urls.py           # Routage principal
│   ├── wsgi.py
│   └── asgi.py
├── users/
│   ├── models.py         # CustomUser, Etudiant, Classe, AgentScolarite, Bibliothecaire, Medecin
│   ├── serializers.py    # Sérialisation + création combinée user/profil
│   ├── views.py          # ViewSets et MeView
│   ├── permissions.py    # Permission IsAgent
│   ├── backends.py       # Authentification par email
│   └── migrations/
├── manage.py
└── requirements.txt

frontend/
├── src/
│   ├── app/
│   │   ├── login/page.tsx         # Page de connexion
│   │   ├── dashboard/
│   │   │   ├── layout.tsx         # Layout avec Sidebar et Header
│   │   │   ├── page.tsx           # Accueil dashboard (stats ou profil)
│   │   │   ├── etudiants/page.tsx
│   │   │   ├── classes/page.tsx
│   │   │   ├── agents/page.tsx
│   │   │   ├── bibliothecaires/page.tsx
│   │   │   └── medecins/page.tsx
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Modal.tsx
│   │   ├── StatsCard.tsx
│   │   └── forms/
│   │       ├── EtudiantForm.tsx
│   │       ├── ClasseForm.tsx
│   │       └── PersonnelForm.tsx
│   ├── context/
│   │   └── AuthContext.tsx        # Contexte auth (login, logout, user courant)
│   └── lib/
│       ├── api.ts                 # Client HTTP avec gestion automatique du refresh JWT
│       └── types.ts               # Types TypeScript partagés
├── package.json
├── next.config.ts
└── tailwind.config.ts
```

---

## API — Endpoints

### Authentification

| Méthode | Endpoint | Description |
|---|---|---|
| `POST` | `/api/token/` | Obtenir un access token + refresh token |
| `POST` | `/api/token/refresh/` | Renouveler l'access token |
| `GET` | `/api/me/` | Profil de l'utilisateur connecté |

**Exemple de connexion :**
```json
POST /api/token/
{
  "username": "nom_utilisateur_ou_email",
  "password": "motdepasse"
}
```

**Réponse :**
```json
{
  "access": "<access_token>",
  "refresh": "<refresh_token>"
}
```

### Ressources (toutes protégées par JWT)

| Méthode | Endpoint | Description | Permission |
|---|---|---|---|
| `GET` | `/api/etudiants/` | Liste des étudiants | Tous les rôles |
| `POST` | `/api/etudiants/` | Créer un étudiant | Agent seulement |
| `PATCH` | `/api/etudiants/{id}/` | Modifier un étudiant | Agent seulement |
| `DELETE` | `/api/etudiants/{id}/` | Supprimer un étudiant | Agent seulement |
| `GET/POST/...` | `/api/classes/` | Gestion des classes | Authentifié |
| `GET/POST/...` | `/api/agents/` | Gestion des agents | Authentifié |
| `GET/POST/...` | `/api/bibliothecaires/` | Gestion des bibliothécaires | Authentifié |
| `GET/POST/...` | `/api/medecins/` | Gestion des médecins | Authentifié |

### Interface d'administration

Accessible sur `/admin/` avec les identifiants du superutilisateur créé lors de l'installation.

---

## Rôles et permissions

| Rôle | Code | Accès dashboard | Droits spéciaux |
|---|---|---|---|
| Agent de scolarité | `agent` | Stats globales (tous les membres) | Créer / modifier / supprimer des étudiants |
| Bibliothécaire | `biblio` | Nombre d'étudiants | Lecture seule |
| Médecin | `medecin` | Nombre d'étudiants | Lecture seule |
| Étudiant | `etudiant` | Son propre profil uniquement | Aucun |

**Comportement selon le rôle sur le dashboard :**
- **Agent** : voit les compteurs de tous les membres (étudiants, classes, agents, bibliothécaires, médecins) et peut effectuer toutes les opérations CRUD.
- **Bibliothécaire / Médecin** : voit uniquement le nombre d'étudiants inscrits.
- **Étudiant** : voit uniquement sa propre fiche (code permanent, filière, niveau, UFR, etc.).

---

## Authentification JWT

Le frontend gère automatiquement le cycle de vie des tokens :

- Les tokens sont stockés dans le `localStorage` (`access_token` et `refresh_token`).
- Chaque requête API inclut automatiquement le header `Authorization: Bearer <token>`.
- Si le serveur répond `401 Unauthorized`, le client tente un refresh silencieux via `/api/token/refresh/`.
- Si le refresh échoue, l'utilisateur est redirigé vers `/login` et les tokens sont supprimés.

**Durées de vie configurées :**
- Access token : **30 minutes**
- Refresh token : **1 jour**

---

## Administration Django

L'interface admin Django est disponible à `http://localhost:8000/admin/`. Elle permet de gérer tous les modèles directement :
- Utilisateurs personnalisés (`CustomUser`)
- Profils (Etudiant, AgentScolarite, Bibliothecaire, Medecin)
- Classes

---

## Notes pour la production

- Changer `SECRET_KEY` dans `settings.py` par une valeur forte et secrète.
- Passer `DEBUG = False` et configurer `ALLOWED_HOSTS` correctement.
- Mettre à jour `CORS_ALLOWED_ORIGINS` avec l'URL réelle du frontend.
- Utiliser un serveur WSGI de production (ex : Gunicorn) derrière un reverse proxy (ex : Nginx).
- Stocker les secrets dans des variables d'environnement, jamais en dur dans le code.

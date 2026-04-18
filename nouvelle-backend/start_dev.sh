#!/bin/bash
set -e

cd "$(dirname "$0")/backend"

echo "📦 Application des migrations..."
python3 manage.py migrate

echo "🐍 Lancement du serveur Django sur http://localhost:8000"
python3 manage.py runserver

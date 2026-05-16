#!/usr/bin/env bash
# =============================================================================
# GuineaTender AI — Script de correction des erreurs Prisma
# Résout les 3 bugs signalés :
#   1. take/skip passés comme String au lieu de Int (corrigé dans le code via QueryDossierDto)
#   2. alertes.organisationId n'existe pas (migration + régénération du client Prisma)
#   3. Erreur en cascade sur appels-offres (même cause que #2)
# =============================================================================

set -euo pipefail

echo "🔧 GuineaTender AI — Correction des erreurs Prisma"
echo "=================================================="
echo ""

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ] || [ ! -d "packages/database" ]; then
  echo "❌ Ce script doit être exécuté depuis la racine du projet datasphere/"
  exit 1
fi

echo "📋 Étape 1/4 : Installation des dépendances..."
npm install

echo ""
echo "📋 Étape 2/4 : Génération du client Prisma (depuis le schéma mis à jour)..."
cd packages/database
npx prisma generate
cd ../..

echo ""
echo "📋 Étape 3/4 : Application de la migration (suppression organisationId de alertes)..."
cd packages/database
npx prisma migrate deploy
cd ../..

echo ""
echo "📋 Étape 4/4 : Vérification du schéma..."
cd packages/database
npx prisma validate
cd ../..

echo ""
echo "✅ Corrections appliquées !"
echo ""
echo "Résumé des corrections :"
echo "  1. ✅ QueryDossierDto créé — take/skip sont maintenant des Number (pas des String)"
echo "  2. ✅ Migration appliquée — organisationId supprimé de la table alertes"
echo "  3. ✅ Client Prisma régénéré — les requêtes utilisent ao: { organisationId } au lieu de alertes.organisationId"
echo ""
echo "Vous pouvez maintenant démarrer l'API : npm run dev:api"

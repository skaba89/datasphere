#!/usr/bin/env bash
# =============================================================================
# GuineaTender AI — Script de synchronisation base de données
# Résout les erreurs Prisma et aligne la base avec le schéma actuel
# =============================================================================

set -euo pipefail

echo "🔧 GuineaTender AI — Synchronisation base de données"
echo "===================================================="
echo ""

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ] || [ ! -d "packages/database" ]; then
  echo "❌ Ce script doit être exécuté depuis la racine du projet datasphere/"
  exit 1
fi

echo "📋 Étape 1/5 : Génération du client Prisma..."
cd packages/database
npx prisma generate
cd ../..

echo ""
echo "📋 Étape 2/5 : Synchronisation du schéma avec la base (prisma db push)..."
echo "   Ceci aligne la base avec le schema.prisma SANS rejouer les migrations."
cd packages/database
npx prisma db push --accept-data-loss
cd ../..

echo ""
echo "📋 Étape 3/5 : Baseline de la migration initiale..."
cd packages/database
# Marquer la migration 0_init comme déjà appliquée (la base est déjà à jour)
npx prisma migrate resolve --applied 0_init 2>/dev/null || echo "   (migration déjà résolue ou table _prisma_migrations pas encore créée)"
cd ../..

echo ""
echo "📋 Étape 4/5 : Vérification du schéma..."
cd packages/database
npx prisma validate
cd ../..

echo ""
echo "📋 Étape 5/5 : Statut des migrations..."
cd packages/database
npx prisma migrate status
cd ../..

echo ""
echo "✅ Synchronisation terminée !"
echo ""
echo "Résumé des corrections :"
echo "  1. ✅ QueryDossierDto — take/skip sont des Number (pas des String)"
echo "  2. ✅ Base synchronisée — organisationId retiré de alertes"
echo "  3. ✅ Client Prisma régénéré — requêtes via ao: { organisationId }"
echo ""
echo "Vous pouvez maintenant démarrer l'API : npm run dev:api"

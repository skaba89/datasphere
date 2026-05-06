-- GuineaTender AI — Migration: workflow de validation dossier
-- Ajoute les statuts EN_VALIDATION, VALIDE, REJETE et la table dossier_validations

-- Nouveaux statuts dans l'enum DossierStatus
ALTER TYPE "DossierStatus" ADD VALUE IF NOT EXISTS 'EN_VALIDATION';
ALTER TYPE "DossierStatus" ADD VALUE IF NOT EXISTS 'VALIDE';
ALTER TYPE "DossierStatus" ADD VALUE IF NOT EXISTS 'REJETE';

-- Enum pour la décision de validation
DO $$ BEGIN
  CREATE TYPE "ValidationDecision" AS ENUM ('APPROUVE', 'REJETE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Champs de validation sur le dossier
ALTER TABLE "dossiers"
  ADD COLUMN IF NOT EXISTS "validatedById"  TEXT,
  ADD COLUMN IF NOT EXISTS "validatedAt"    TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "validationNote" TEXT;

-- Table des validations (historique complet)
CREATE TABLE IF NOT EXISTS "dossier_validations" (
  "id"          TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decision"    "ValidationDecision" NOT NULL,
  "commentaire" TEXT NOT NULL,
  "checklistOk" JSONB NOT NULL DEFAULT '[]',
  "dossierId"   TEXT NOT NULL,
  "valideurId"  TEXT NOT NULL,

  CONSTRAINT "dossier_validations_pkey" PRIMARY KEY ("id")
);

-- Index et FK
CREATE INDEX IF NOT EXISTS "dossier_validations_dossierId_idx" ON "dossier_validations"("dossierId");

ALTER TABLE "dossier_validations"
  ADD CONSTRAINT "dossier_validations_dossierId_fkey"
    FOREIGN KEY ("dossierId") REFERENCES "dossiers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "dossier_validations_valideurId_fkey"
    FOREIGN KEY ("valideurId") REFERENCES "users"("id") ON UPDATE CASCADE;

ALTER TABLE "dossiers"
  ADD CONSTRAINT "dossiers_validatedById_fkey"
    FOREIGN KEY ("validatedById") REFERENCES "users"("id") ON UPDATE CASCADE;

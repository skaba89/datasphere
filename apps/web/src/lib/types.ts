// =============================================================================
// GuineaTender AI — Types partagés frontend
// =============================================================================

// ── Enums (alignés sur Prisma schema) ─────────────────────────────────────────

export type AOSource =
  | 'TELEMO' | 'ARMP' | 'JAO_GUINEE' | 'ANDE'
  | 'MINISTERE_BUDGET' | 'MINISTERE_NUMERIQUE'
  | 'BANQUE_MONDIALE' | 'BAD' | 'PNUD'
  | 'UNICEF' | 'OMS' | 'FAO' | 'CEDEAO'
  | 'DCMP_SENEGAL' | 'DMP_COTE_IVOIRE' | 'AUTRE'

export type AOSector =
  | 'NUMERIQUE' | 'SANTE' | 'EDUCATION' | 'TRANSPORT'
  | 'AGRICULTURE' | 'FINANCE' | 'SECURITE' | 'ENVIRONNEMENT'
  | 'GOUVERNANCE' | 'INFRASTRUCTURE' | 'ENERGIE' | 'EAU' | 'AUTRE'

export type AOType = 'FOURNITURE' | 'SERVICE' | 'TRAVAUX' | 'CONSULTANT' | 'MIXTE'

export type AOStatus =
  | 'NOUVEAU' | 'QUALIFIE' | 'EN_COURS'
  | 'SOUMIS' | 'REMPORTE' | 'PERDU' | 'ARCHIVE'

export type DossierStatus =
  | 'BROUILLON' | 'EN_COURS' | 'REVUE' | 'EN_VALIDATION'
  | 'VALIDE' | 'REJETE' | 'SOUMIS' | 'ARCHIVE'

export type UserRole = 'ADMIN' | 'MANAGER' | 'WRITER' | 'READER' | 'VIEWER'

// ── Appel d'Offre ─────────────────────────────────────────────────────────────

export interface AppelOffre {
  id: string
  createdAt: string
  updatedAt: string

  // Source & identification
  source: AOSource
  sourceId?: string | null
  sourceUrl?: string | null

  // Informations principales
  titre: string
  objet: string
  entiteAdj: string
  entiteAdjPays: string
  secteur: AOSector
  typeMarche: AOType

  // Financier
  budgetEstimeGNF?: number | string | null  // BigInt serialisé en string
  budgetDevise?: string | null
  budgetMontant?: number | null
  financeur?: string | null

  // Dates
  datePublication: string
  dateLimite: string
  dureeMarche?: number | null

  // Contenu extrait
  criteresEligibilite: Record<string, any> | any[]
  criteresEvaluation: Record<string, any> | any[]
  documentUrls: string[]
  documentParsed: Record<string, any>
  resumeIA?: string | null

  // Scoring
  score?: number | null
  scoreDetails: Record<string, any>
  scoreUpdatedAt?: string | null

  // Statut & workflow
  status: AOStatus
  decisionGoNoGo?: boolean | null
  decisionMotif?: string | null
  decisionDate?: string | null

  // Attribution
  attributaireNom?: string | null
  attributaireMontant?: number | string | null
  retourExperience?: string | null

  // Relations
  organisationId: string
  assignes?: UserMini[]
  dossiers?: DossierMini[]
  alertes?: AlerteMini[]
  _count?: { dossiers: number }
}

export interface AppelOffreListResponse {
  data: AppelOffre[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

// ── Mini types (pour les relations) ───────────────────────────────────────────

export interface UserMini {
  id: string
  prenom: string
  nom: string
  email?: string
  avatarUrl?: string | null
}

export interface DossierMini {
  id: string
  titre: string
  status: DossierStatus
  createdAt: string
}

export interface AlerteMini {
  id: string
  titre: string
  message: string
  lue: boolean
}

// ── Scoring ───────────────────────────────────────────────────────────────────

export interface ScoringDimension {
  nom: string
  score: number
  poids: number
  detail?: string
}

export interface ScoringResult {
  scoreFinal: number
  recommandation: 'GO' | 'MAYBE' | 'NO_GO'
  dimensions: ScoringDimension[]
  alertes: string[]
}

// ── Contact ───────────────────────────────────────────────────────────────────

export interface Contact {
  id: string
  prenom: string
  nom: string
  titre?: string | null
  poste?: string | null
  email: string[]
  telephone: string[]
  photoUrl?: string | null
  scoreProximite: number
  enrichiAuto: boolean
  entiteId?: string | null
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string
  email: string
  prenom: string
  nom: string
  role: UserRole
  avatarUrl?: string | null
  organisationId: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

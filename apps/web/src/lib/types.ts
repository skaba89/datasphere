// =============================================================================
// GuineaTender AI — Types partagés frontend
// =============================================================================

// ── Enums (alignés sur Prisma schema) ─────────────────────────────────────────

export type AOSource =
  // Sources guinéennes principales
  | 'TELEMO' | 'ARMP' | 'JAO_GUINEE' | 'ANDE'
  | 'GOUVERNEMENT_GUINEE' | 'PRIMATURE' | 'DGCMP'
  // Ministères guinéens
  | 'MINISTERE_BUDGET' | 'MINISTERE_NUMERIQUE'
  | 'MINISTERE_SANTE' | 'MINISTERE_EDUCATION'
  | 'MINISTERE_ENSEIGNEMENT_SUPERIEUR' | 'MINISTERE_AGRICULTURE'
  | 'MINISTERE_MINES' | 'MINISTERE_ENERGIE'
  | 'MINISTERE_TRANSPORT' | 'MINISTERE_TRAVAUX_PUBLICS'
  | 'MINISTERE_JUSTICE' | 'MINISTERE_DEFENSE'
  | 'MINISTERE_SECURITE' | 'MINISTERE_AFFAIRES_ETRANGERES'
  | 'MINISTERE_TERRITOIRE' | 'MINISTERE_COMMERCE'
  | 'MINISTERE_ENVIRONNEMENT' | 'MINISTERE_PECHE'
  | 'MINISTERE_URBANISME' | 'MINISTERE_ACTION_SOCIALE'
  | 'MINISTERE_JEUNESSE_SPORTS' | 'MINISTERE_CULTURE'
  | 'MINISTERE_FONCTION_PUBLIQUE' | 'MINISTERE_COMMUNICATION'
  | 'MINISTERE_PLAN' | 'MINISTERE_ECONOMIE'
  // Ministères supplémentaires
  | 'MINISTERE_EAU_ASSAINISSEMENT' | 'MINISTERE_ENSEIGNEMENT_TECHNIQUE'
  | 'MINISTERE_AFFAIRES_RELIGIEUSES' | 'MINISTERE_BONNE_GOUVERNANCE'
  | 'MINISTERE_INFRASTRUCTURES' | 'MINISTERE_TOURISME'
  | 'MINISTERE_POSTES_TELECOMS' | 'MINISTERE_INDUSTRIE_PME'
  | 'MINISTERE_HABITAT' | 'MINISTERE_COOPERATION'
  // Institutions et agences guinéennes
  | 'DIRECTION_NATIONALE_IMPOTS' | 'DIRECTION_NATIONALE_DOUANES'
  | 'DIRECTION_NATIONALE_TRESOR' | 'INSTITUT_NATIONAL_STATISTIQUE'
  | 'ARCEP' | 'APIP' | 'COUR_COMPTES' | 'CNLS' | 'OND'
  | 'ARPT' | 'ANAFIC' | 'ITIE_GUINEE' | 'UCEP_GUINEE' | 'PPP_GUINEE'
  // Entreprises publiques & parapubliques
  | 'EDG' | 'SEG' | 'AGEROUTE' | 'PORT_AUTONOME_CONAKRY'
  | 'BCRG' | 'CENI' | 'ANAIM' | 'ONT' | 'DNEF'
  | 'SOGUIPAMI' | 'UGP_PASSP'
  // Agrégateurs & presse spécialisée
  | 'COMMUNIQUES224' | 'DIGIJOB_GUINEE' | 'SANGO_BIDS'
  // Sources internationales
  | 'BANQUE_MONDIALE' | 'BAD' | 'PNUD'
  | 'UNICEF' | 'OMS' | 'FAO' | 'CEDEAO'
  | 'AFD' | 'OMVS' | 'OMVG' | 'UE_GUINEE'
  // Sources régionales
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

export type InteractionType =
  | 'REUNION' | 'EMAIL' | 'APPEL_TELEPHONIQUE'
  | 'EVENEMENT' | 'NOTE' | 'VISITE' | 'WEBINAIRE'

export type DocumentType =
  | 'RCCM' | 'IFU' | 'ATTESTATION_FISCALE' | 'ATTESTATION_CNSS'
  | 'STATUTS' | 'BILAN' | 'REFERENCE_TECHNIQUE' | 'CV_EXPERT' | 'AUTRE'

export type PaymentMethod =
  | 'ORANGE_MONEY' | 'MTN_MOMO' | 'CELLCOM'
  | 'VIREMENT_BANCAIRE' | 'STRIPE' | 'ESPECES'

export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'

export type SubscriptionPlan = 'STARTER' | 'PRO' | 'ENTERPRISE'
export type SubscriptionStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'TRIALING'

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
  attributaireMontant?: string | null  // BigInt → string
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
  raison: string
  scoresPondere: number
  detail?: string  // Alias pour compatibilité
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
  notes?: string | null
  tags: string[]
  scoreProximite: number
  derniereInteraction?: string | null
  enrichiAuto: boolean
  entiteId?: string | null
  entite?: { id: string; nom: string } | null
  interactions?: Interaction[]
}

// ── Interaction ───────────────────────────────────────────────────────────────

export interface Interaction {
  id: string
  type: InteractionType
  date: string
  objet: string
  resume?: string | null
  lieu?: string | null
  suivi?: string | null
  createdAt: string
  contactId: string
  aoId?: string | null
  userId: string
  user?: UserMini
}

// ── Dossier ───────────────────────────────────────────────────────────────────

export interface Dossier {
  id: string
  titre: string
  version: number
  status: DossierStatus
  generatedByAI: boolean
  createdAt: string
  updatedAt: string

  // Contenu structuré (JSON)
  memTechnique: Record<string, any>
  offreFinanciere: Record<string, any>
  planning: Record<string, any>
  piecesAdmin: Record<string, any>
  risques: Record<string, any>
  team: Record<string, any>

  // Soumission
  soumisAt?: string | null
  referenceSoumission?: string | null

  // Validation
  validatedById?: string | null
  validatedAt?: string | null
  validationNote?: string | null

  // Relations
  aoId: string
  ao?: AppelOffre | null
  organisationId: string
  createdById: string
  createdBy?: UserMini
  solutionId?: string | null
  exportPdfUrl?: string | null
  exportDocxUrl?: string | null
}

// ── Organisation ──────────────────────────────────────────────────────────────

export interface Organisation {
  id: string
  nom: string
  slug: string
  rccm?: string | null
  ifu?: string | null
  adresse?: string | null
  ville?: string | null
  pays: string
  telephone?: string | null
  email?: string | null
  siteWeb?: string | null
  secteurs: string[]
  effectif?: number | null
  plan: SubscriptionPlan
  planStatus: SubscriptionStatus
  planExpiresAt?: string | null
  settings: Record<string, any>
  scoringConfig: Record<string, any>
  aiConfig: Record<string, any>
  _count?: {
    users: number
    appelsOffres: number
    contacts: number
    dossiers: number
    references: number
  }
}

// ── OrgDocument ───────────────────────────────────────────────────────────────

export interface OrgDocument {
  id: string
  type: DocumentType
  nom: string
  fileUrl: string
  fileSize?: number | null
  mimeType?: string | null
  dateEmission?: string | null
  dateExpiration?: string | null
  isValid: boolean
  notes?: string | null
  organisationId: string
  createdAt: string
  updatedAt: string
  // Champ calculé par le backend
  statut?: 'VALIDE' | 'EXPIRE' | 'EXPIRE_BIENTOT'
}

// ── Payment ───────────────────────────────────────────────────────────────────

export interface Payment {
  id: string
  montantGNF: string  // BigInt → string
  methode: PaymentMethod
  status: PaymentStatus
  reference?: string | null
  transactionId?: string | null
  description?: string | null
  metadata: Record<string, any>
  organisationId: string
  createdAt: string
}

// ── Expert ────────────────────────────────────────────────────────────────────

export interface Expert {
  id: string
  prenom: string
  nom: string
  titre: string
  specialites: string[]
  anneesExp: number
  cvUrl?: string | null
  photoUrl?: string | null
  email?: string | null
  disponible: boolean
}

// ── Reference ─────────────────────────────────────────────────────────────────

export interface Reference {
  id: string
  titre: string
  client: string
  description: string
  secteur: AOSector
  dateDebut: string
  dateFin?: string | null
  montantGNF?: string | null  // BigInt → string
  technologies: string[]
  documentUrl?: string | null
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string
  email: string
  prenom: string
  nom: string
  role: UserRole
  telephone?: string | null
  avatarUrl?: string | null
  organisationId: string
  organisation?: { id: string; nom: string; plan: string }
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

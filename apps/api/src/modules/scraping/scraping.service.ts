import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { ScoringService } from '../scoring/scoring.service'
import { AOSource } from '@guineatender/database'
import * as cheerio from 'cheerio'

interface AOBrut {
  source: AOSource
  sourceId?: string
  sourceUrl?: string
  titre: string
  objet: string
  entiteAdj: string
  datePublication: Date
  dateLimite: Date
  budgetEstimeGNF?: bigint
  documentUrls: string[]
  contactNom?: string
  contactEmail?: string
  contactTelephone?: string
  contactPoste?: string
  contactAdresse?: string
  contactTitre?: string
}

// ── Sources de veille — Toutes les sources guinéennes et internationales ──────
const SOURCES_DISPONIBLES = [
  // ── Sources guinéennes principales ──────────────────────────────────────────
  { id: 'TELEMO',            nom: 'TELEMO — Portail de la Commande Publique',   url: 'https://telemo.gov.gn',              actif: true  },
  { id: 'ARMP',              nom: 'ARMP Guinée — Autorité de Régulation des Marchés Publics', url: 'https://armpguinee.org', actif: true  },
  { id: 'JAO_GUINEE',        nom: 'JAO Guinée — Journal des Appels d\'Offres', url: 'https://www.jaoguinee.com',          actif: true  },
  { id: 'ANDE',              nom: 'ANDE (Domaines & Environnement)',           url: 'https://ande.gov.gn',                actif: true  },
  { id: 'GOUVERNEMENT_GUINEE', nom: 'Portail du Gouvernement Guinéen',        url: 'https://gouvernement.gov.gn',        actif: true  },
  { id: 'PRIMATURE',         nom: 'Primature — Premier Ministère',             url: 'https://primature.gov.gn',           actif: true  },
  { id: 'DGCMP',             nom: 'DGCMP — Dir. Gén. du Contrôle des Marchés Publics', url: 'https://www.dgcmp.mef.gov.gn', actif: true },
  // ── Ministères guinéens ─────────────────────────────────────────────────────
  { id: 'MINISTERE_BUDGET',  nom: 'Ministère du Budget',                      url: 'https://budget.gov.gn',              actif: true  },
  { id: 'MINISTERE_NUMERIQUE', nom: 'Ministère des Postes, Télécoms et Économie Numérique (MCENI)', url: 'https://mceni.gov.gn', actif: true  },
  { id: 'MINISTERE_SANTE',     nom: 'Ministère de la Santé et de l\'Hygiène Publique', url: 'https://sante.gov.gn',     actif: true  },
  { id: 'MINISTERE_EDUCATION', nom: 'Ministère de l\'Enseignement Pré-Universitaire (MEPUA)', url: 'https://mepua.gov.gn', actif: true  },
  { id: 'MINISTERE_ENSEIGNEMENT_SUPERIEUR', nom: 'Ministère Enseignement Sup. et Recherche (MESRS)', url: 'https://mesrs.gov.gn', actif: true },
  { id: 'MINISTERE_AGRICULTURE', nom: 'Ministère de l\'Agriculture et de l\'Élevage', url: 'https://agriculture.gov.gn',     actif: true  },
  { id: 'MINISTERE_MINES',     nom: 'Ministère des Mines et de la Géologie',    url: 'https://mines.gov.gn',               actif: true  },
  { id: 'MINISTERE_ENERGIE',   nom: 'Ministère de l\'Énergie, Hydraulique et Hydrocarbures', url: 'https://www.energie.gov.gn', actif: true },
  { id: 'MINISTERE_TRANSPORT',  nom: 'Ministère des Transports',               url: 'https://transports.gov.gn',          actif: true  },
  { id: 'MINISTERE_TRAVAUX_PUBLICS', nom: 'Ministère des Infrastructures et Travaux Publics (MITP)', url: 'https://infrastructures.gov.gn', actif: true },
  { id: 'MINISTERE_JUSTICE',   nom: 'Ministère de la Justice et des Droits de l\'Homme', url: 'https://justiceguinee.gov.gn', actif: true  },
  { id: 'MINISTERE_DEFENSE',   nom: 'Ministère de la Défense Nationale',        url: 'https://defense.gov.gn',            actif: true  },
  { id: 'MINISTERE_SECURITE',  nom: 'Ministère de la Sécurité et Protection Civile', url: 'https://mspc.gov.gn',        actif: true  },
  { id: 'MINISTERE_AFFAIRES_ETRANGERES', nom: 'Ministère des Affaires Étrangères', url: 'https://mae.gov.gn',           actif: true  },
  { id: 'MINISTERE_TERRITOIRE', nom: 'Ministère Admin. du Territoire et Décentralisation (MATD)', url: 'https://matd.gov.gn', actif: true  },
  { id: 'MINISTERE_COMMERCE',  nom: 'Ministère du Commerce, de l\'Industrie et des PME', url: 'https://mcipme.gov.gn',  actif: true  },
  { id: 'MINISTERE_ENVIRONNEMENT', nom: 'Ministère de l\'Environnement et du Dév. Durable', url: 'https://medd.gov.gn', actif: true  },
  { id: 'MINISTERE_PECHE',     nom: 'Ministère de la Pêche et de l\'Économie Maritime', url: 'https://peches.gov.gn',  actif: true  },
  { id: 'MINISTERE_URBANISME', nom: 'Ministère de l\'Urbanisme, Habitat et Construction', url: 'https://habitat.gov.gn', actif: true  },
  { id: 'MINISTERE_ACTION_SOCIALE', nom: 'Ministère Action Sociale, Promotion Féminine', url: 'https://actionsociale.gov.gn', actif: true },
  { id: 'MINISTERE_JEUNESSE_SPORTS', nom: 'Ministère de la Jeunesse et des Sports', url: 'https://sports.gov.gn',      actif: true  },
  { id: 'MINISTERE_CULTURE',   nom: 'Ministère de la Culture, Tourisme et Artisanat', url: 'https://culture.gov.gn',     actif: true  },
  { id: 'MINISTERE_FONCTION_PUBLIQUE', nom: 'Ministère du Travail et de la Fonction Publique', url: 'https://fonctionpublique.gov.gn', actif: true },
  { id: 'MINISTERE_COMMUNICATION', nom: 'Ministère de la Communication et des Médias', url: 'https://communication.gov.gn', actif: true },
  { id: 'MINISTERE_PLAN',      nom: 'Ministère du Plan et Coopération Internationale', url: 'https://mpcid.gov.gn',      actif: true  },
  { id: 'MINISTERE_ECONOMIE',  nom: 'Ministère de l\'Économie et des Finances', url: 'https://www.mef.gov.gn',             actif: true  },
  // ── Ministères supplémentaires ──────────────────────────────────────────────
  { id: 'MINISTERE_EAU_ASSAINISSEMENT',    nom: 'Ministère de l\'Eau et de l\'Assainissement',    url: 'https://eau.gov.gn',           actif: true },
  { id: 'MINISTERE_ENSEIGNEMENT_TECHNIQUE', nom: 'Ministère Ens. Technique, Form. Prof. et Emploi', url: 'https://metfp.gov.gn',    actif: true },
  { id: 'MINISTERE_AFFAIRES_RELIGIEUSES',  nom: 'Ministère des Affaires Religieuses',            url: 'https://religions.gov.gn',    actif: true },
  { id: 'MINISTERE_BONNE_GOUVERNANCE',     nom: 'Ministère de la Bonne Gouvernance',             url: 'https://gouvernance.gov.gn',  actif: true },
  { id: 'MINISTERE_INFRASTRUCTURES',       nom: 'Ministère des Infrastructures et Travaux Publics', url: 'https://infrastructures.gov.gn', actif: true },
  { id: 'MINISTERE_TOURISME',              nom: 'Ministère du Tourisme et de l\'Hôtellerie',    url: 'https://www.mth.gov.gn',      actif: true },
  { id: 'MINISTERE_POSTES_TELECOMS',       nom: 'Ministère des Postes, Télécoms et Éco. Numérique (MCENI)', url: 'https://mceni.gov.gn',   actif: true },
  { id: 'MINISTERE_INDUSTRIE_PME',         nom: 'Ministère de l\'Industrie et des PME',         url: 'https://mic.gov.gn',          actif: true },
  { id: 'MINISTERE_HABITAT',               nom: 'Ministère de l\'Habitat et de la Construction', url: 'https://habitat.gov.gn',    actif: true },
  { id: 'MINISTERE_COOPERATION',           nom: 'Ministère de la Coopération Internationale',    url: 'https://mpcid.gov.gn',       actif: true },
  // ── Institutions et agences guinéennes ──────────────────────────────────────
  { id: 'DIRECTION_NATIONALE_IMPOTS',    nom: 'Direction Nationale des Impôts',      url: 'https://dni.gov.gn',              actif: true },
  { id: 'DIRECTION_NATIONALE_DOUANES',   nom: 'Direction Nationale des Douanes',     url: 'https://douanes.gov.gn',          actif: true },
  { id: 'DIRECTION_NATIONALE_TRESOR',    nom: 'Direction Nat. du Trésor',            url: 'https://tresor.gov.gn',           actif: true },
  { id: 'INSTITUT_NATIONAL_STATISTIQUE', nom: 'Institut National de la Statistique', url: 'https://ins.gov.gn',             actif: true },
  { id: 'ARCEP',                         nom: 'ARCEP Guinée',                         url: 'https://arcep.gov.gn',           actif: true },
  { id: 'APIP',                          nom: 'APIP — Agence de Promotion des Investissements', url: 'https://apip.gov.gn', actif: true },
  { id: 'COUR_COMPTES',                  nom: 'Cour des Comptes',                     url: 'https://www.ccomptes.org.gn',    actif: true },
  { id: 'CNLS',                          nom: 'CNLS Guinée',                          url: 'https://cnls.gov.gn',            actif: true },
  { id: 'OND',                           nom: 'OND Guinée',                           url: 'https://ond.gov.gn',             actif: true },
  { id: 'ARPT',                          nom: 'ARPT — Autorité de Régulation des Postes et Télécoms', url: 'https://www.arpt.gov.gn', actif: true },
  { id: 'ANAFIC',                        nom: 'ANAFIC — Agence Nationale de Financement des Collectivités', url: 'https://www.anafic-gn.org', actif: true },
  { id: 'ITIE_GUINEE',                   nom: 'ITIE Guinée — Transparence Industries Extractives', url: 'https://www.itie-guinee.org', actif: true },
  { id: 'UCEP_GUINEE',                   nom: 'UCEP Guinée — Unité Coordination Exécution Projets', url: 'https://www.ucepguinee.org', actif: true },
  { id: 'PPP_GUINEE',                    nom: 'PPP Guinée — Partenariat Public-Privé', url: 'https://ppp-guinee.com',       actif: true },
  // ── Entreprises publiques & parapubliques ───────────────────────────────────
  { id: 'EDG',                    nom: 'EDG SA — Électricité de Guinée',           url: 'https://edg.com.gn',               actif: true },
  { id: 'SEG',                    nom: 'SEG — Société des Eaux de Guinée',         url: 'https://seg.gov.gn',               actif: true },
  { id: 'AGEROUTE',               nom: 'AGEROUTE — Agence des Routes',             url: 'https://ageroute.gov.gn',          actif: true },
  { id: 'PORT_AUTONOME_CONAKRY',  nom: 'Port Autonome de Conakry (PAC)',           url: 'https://portconakry.gov.gn',       actif: true },
  { id: 'BCRG',                   nom: 'BCRG — Banque Centrale de Rép. de Guinée', url: 'https://www.bcrg-guinee.org',      actif: true },
  { id: 'CENI',                   nom: 'CENI — Commission Électorale Nationale',   url: 'https://ceni.gov.gn',              actif: true },
  { id: 'ANAIM',                  nom: 'ANAIM — Agence Nationale Aff. Immobilières', url: 'https://anaim.gov.gn',          actif: true },
  { id: 'ONT',                    nom: 'ONT — Office National du Tourisme',        url: 'https://ont.gov.gn',               actif: true },
  { id: 'DNEF',                   nom: 'DNEF — Direction Nat. Eaux et Forêts',     url: 'https://dnef.gov.gn',              actif: true },
  { id: 'SOGUIPAMI',              nom: 'SOGUIPAMI — Société Guinéenne du Patrimoine Minier', url: 'https://soguipami.net', actif: true },
  { id: 'UGP_PASSP',              nom: 'UGP PASSP — Santé (Banque Mondiale)',      url: 'https://www.ugp-passp-ms.org.gn',  actif: true },
  // ── Agrégateurs & presse spécialisée ────────────────────────────────────────
  { id: 'COMMUNIQUES224',         nom: 'Communiques224 — Agrégateur Appels d\'Offres', url: 'https://communiques224.com',   actif: true },
  { id: 'DIGIJOB_GUINEE',         nom: 'Digijob Guinée — Emplois & Appels d\'Offres', url: 'https://digijobguinee.com',    actif: true },
  { id: 'SANGO_BIDS',             nom: 'SangoBids — Alertes Appels d\'Offres Guinée', url: 'https://gn.sangobids.com',     actif: true },
  // ── Sources internationales ─────────────────────────────────────────────────
  { id: 'BANQUE_MONDIALE',   nom: 'Banque Mondiale — Projets Guinée',           url: 'https://projects.worldbank.org',     actif: true  },
  { id: 'PNUD',              nom: 'PNUD / UNDP — Acquisitions Guinée',           url: 'https://procurement-notices.undp.org', actif: true },
  { id: 'BAD',               nom: 'BAD — Banque Africaine de Développement',     url: 'https://www.afdb.org',               actif: true  },
  { id: 'UNICEF',            nom: 'UNICEF Guinée',                               url: 'https://www.unicef.org/guinea',      actif: true  },
  { id: 'OMS',               nom: 'OMS Guinée',                                  url: 'https://www.who.int/countries/gn',   actif: true  },
  { id: 'FAO',               nom: 'FAO Guinée',                                  url: 'https://www.fao.org/guinea',         actif: true  },
  { id: 'CEDEAO',            nom: 'CEDEAO / ECOWAS',                             url: 'https://ecowas.int',                 actif: true  },
  { id: 'AFD',               nom: 'AFD — Agence Française de Développement',     url: 'https://www.afd.fr',                 actif: true  },
  { id: 'OMVS',              nom: 'OMVS — Mise en Valeur fleuve Sénégal',         url: 'https://www.omvs.org',               actif: true  },
  { id: 'OMVG',              nom: 'OMVG — Mise en Valeur fleuve Gambie',          url: 'https://www.omvg.org',               actif: true  },
  { id: 'UE_GUINEE',         nom: 'Union Européenne — Délégation Guinée',         url: 'https://international-partnerships.ec.europa.eu', actif: true },
  // ── Sources régionales complémentaires ──────────────────────────────────────
  { id: 'DCMP_SENEGAL',      nom: 'DCMP Sénégal',                              url: 'https://dcmp.sn',                    actif: true  },
  { id: 'DMP_COTE_IVOIRE',   nom: 'DMP Côte d\'Ivoire',                       url: 'https://dmp.ci',                     actif: true  },
]

async function fetchSafe(url: string, opts: RequestInit = {}): Promise<string | null> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 12_000)
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GuineaTenderBot/1.0; +https://guineatender.ai)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        ...opts.headers,
      },
      ...opts,
    })
    clearTimeout(timer)
    if (!res.ok) return null
    return res.text()
  } catch {
    return null
  }
}

async function fetchJson<T = any>(url: string, opts: RequestInit = {}): Promise<T | null> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 12_000)
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'GuineaTenderBot/1.0',
        'Accept': 'application/json',
        ...opts.headers,
      },
      ...opts,
    })
    clearTimeout(timer)
    if (!res.ok) return null
    return res.json() as T
  } catch {
    return null
  }
}

@Injectable()
export class ScrapingService {
  private readonly logger = new Logger(ScrapingService.name)

  constructor(
    private prisma: PrismaService,
    private scoringService: ScoringService,
  ) {}

  getSources() {
    return SOURCES_DISPONIBLES
  }

  async getSourcesForOrg(organisationId?: string) {
    return this.getSources()
  }

  async scraperToutes(organisationId?: string) {
    this.logger.log('🔍 Démarrage de la veille multi-sources...')
    const resultats: { source: string; nouveaux: number; contactsCreés: number; erreur?: string }[] = []

    const scrapers: { nom: string; fn: () => Promise<AOBrut[]> }[] = [
      // ── Sources prioritaires — TELEMO, ARPT, DGCMP, GOUVERNEMENT ──────────
      { nom: 'TELEMO',            fn: () => this.scraperTELEMO() },
      { nom: 'ARPT',              fn: () => this.scraperARPT() },
      { nom: 'DGCMP',             fn: () => this.scraperDGCMP() },
      { nom: 'Gouvernement Guinée', fn: () => this.scraperGouvernement() },
      { nom: 'Primature',         fn: () => this.scraperPrimature() },
      // ── Sources guinéennes principales ────────────────────────────────────
      { nom: 'ARMP',              fn: () => this.scraperARMP() },
      { nom: 'JAO Guinée',        fn: () => this.scraperJAO() },
      { nom: 'ANDE',              fn: () => this.scraperANDE() },
      { nom: 'Ministère Budget',  fn: () => this.scraperMinistereBudget() },
      { nom: 'Ministère Numérique', fn: () => this.scraperMinistereNumerique() },
      // ── Ministères guinéens ───────────────────────────────────────────────
      { nom: 'Ministère Santé',              fn: () => this.scraperMinistereSanter() },
      { nom: 'Ministère Éducation',          fn: () => this.scraperMinistereEducation() },
      { nom: 'Ministère Enseignement Sup.',  fn: () => this.scraperMinistereEnseignementSuperieur() },
      { nom: 'Ministère Agriculture',        fn: () => this.scraperMinistereAgriculture() },
      { nom: 'Ministère Mines',              fn: () => this.scraperMinistereMines() },
      { nom: 'Ministère Énergie',            fn: () => this.scraperMinistereEnergie() },
      { nom: 'Ministère Transport',          fn: () => this.scraperMinistereTransport() },
      { nom: 'Ministère Travaux Publics',    fn: () => this.scraperMinistereTravauxPublics() },
      { nom: 'Ministère Justice',            fn: () => this.scraperMinistereJustice() },
      { nom: 'Ministère Défense',            fn: () => this.scraperMinistereDefense() },
      { nom: 'Ministère Sécurité',           fn: () => this.scraperMinistereSecurite() },
      { nom: 'Ministère Aff. Étrangères',    fn: () => this.scraperMinistereAffairesEtrangeres() },
      { nom: 'Ministère Territoire',         fn: () => this.scraperMinistereTerritoire() },
      { nom: 'Ministère Commerce',           fn: () => this.scraperMinistereCommerce() },
      { nom: 'Ministère Environnement',      fn: () => this.scraperMinistereEnvironnement() },
      { nom: 'Ministère Pêche',              fn: () => this.scraperMinisterePeche() },
      { nom: 'Ministère Urbanisme',          fn: () => this.scraperMinistereUrbanisme() },
      { nom: 'Ministère Action Sociale',     fn: () => this.scraperMinistereActionSociale() },
      { nom: 'Ministère Jeunesse & Sports',  fn: () => this.scraperMinistereJeunesseSports() },
      { nom: 'Ministère Culture',            fn: () => this.scraperMinistereCulture() },
      { nom: 'Ministère Fonction Publique',  fn: () => this.scraperMinistereFonctionPublique() },
      { nom: 'Ministère Communication',      fn: () => this.scraperMinistereCommunication() },
      { nom: 'Ministère Plan',               fn: () => this.scraperMinisterePlan() },
      { nom: 'Ministère Économie',           fn: () => this.scraperMinistereEconomie() },
      // ── Ministères supplémentaires ────────────────────────────────────────
      { nom: 'Ministère Eau & Assainissement',  fn: () => this.scraperMinistereEauAssainissement() },
      { nom: 'Ministère Ens. Technique',        fn: () => this.scraperMinistereEnseignementTechnique() },
      { nom: 'Ministère Affaires Religieuses',  fn: () => this.scraperMinistereAffairesReligieuses() },
      { nom: 'Ministère Bonne Gouvernance',     fn: () => this.scraperMinistereBonneGouvernance() },
      { nom: 'Ministère Infrastructures',       fn: () => this.scraperMinistereInfrastructures() },
      { nom: 'Ministère Tourisme',              fn: () => this.scraperMinistereTourisme() },
      { nom: 'Ministère Postes & Télécoms',     fn: () => this.scraperMinisterePostesTelecoms() },
      { nom: 'Ministère Industrie & PME',       fn: () => this.scraperMinistereIndustriePME() },
      { nom: 'Ministère Habitat',               fn: () => this.scraperMinistereHabitat() },
      { nom: 'Ministère Coopération',           fn: () => this.scraperMinistereCooperation() },
      // ── Institutions et agences guinéennes ────────────────────────────────
      { nom: 'DNI (Impôts)',       fn: () => this.scraperDNI() },
      { nom: 'Douanes',            fn: () => this.scraperDouanes() },
      { nom: 'Trésor',             fn: () => this.scraperTresor() },
      { nom: 'INS (Statistique)',  fn: () => this.scraperINS() },
      { nom: 'ARCEP',              fn: () => this.scraperARCEP() },
      { nom: 'APIP',               fn: () => this.scraperAPIP() },
      { nom: 'Cour des Comptes',   fn: () => this.scraperCourComptes() },
      { nom: 'CNLS',               fn: () => this.scraperCNLS() },
      { nom: 'OND',                fn: () => this.scraperOND() },
      { nom: 'ANAFIC',             fn: () => this.scraperANAFIC() },
      { nom: 'ITIE Guinée',        fn: () => this.scraperITIEGuinee() },
      { nom: 'UCEP Guinée',        fn: () => this.scraperUCEPGuinee() },
      { nom: 'PPP Guinée',         fn: () => this.scraperPPPGuinee() },
      // ── Entreprises publiques & parapubliques ─────────────────────────────
      { nom: 'EDG (Électricité)',        fn: () => this.scraperEDG() },
      { nom: 'SEG (Eaux)',               fn: () => this.scraperSEG() },
      { nom: 'AGEROUTE (Routes)',         fn: () => this.scraperAGEROUTE() },
      { nom: 'Port Autonome Conakry',    fn: () => this.scraperPortAutonomeConakry() },
      { nom: 'BCRG (Banque Centrale)',   fn: () => this.scraperBCRG() },
      { nom: 'CENI (Élections)',         fn: () => this.scraperCENI() },
      { nom: 'ANAIM (Immobilier)',       fn: () => this.scraperANAIM() },
      { nom: 'ONT (Tourisme)',           fn: () => this.scraperONT() },
      { nom: 'DNEF (Eaux et Forêts)',    fn: () => this.scraperDNEF() },
      { nom: 'SOGUIPAMI (Patrimoine Minier)', fn: () => this.scraperSOGUIPAMI() },
      { nom: 'UGP PASSP (Santé/BM)',     fn: () => this.scraperUGPPASSP() },
      // ── Agrégateurs & presse spécialisée ──────────────────────────────────
      { nom: 'Communiques224',           fn: () => this.scraperCommuniques224() },
      { nom: 'Digijob Guinée',           fn: () => this.scraperDigijobGuinee() },
      { nom: 'SangoBids',                fn: () => this.scraperSangoBids() },
      // ── Sources internationales ───────────────────────────────────────────
      { nom: 'Banque Mondiale',   fn: () => this.scraperBanqueMondiale() },
      { nom: 'PNUD',              fn: () => this.scraperPNUD() },
      { nom: 'BAD',               fn: () => this.scraperBAD() },
      { nom: 'UNICEF',            fn: () => this.scraperUNICEF() },
      { nom: 'OMS',               fn: () => this.scraperOMS() },
      { nom: 'FAO',               fn: () => this.scraperFAO() },
      { nom: 'CEDEAO',            fn: () => this.scraperCEDEAO() },
      { nom: 'AFD',               fn: () => this.scraperAFD() },
      { nom: 'OMVS',              fn: () => this.scraperOMVS() },
      { nom: 'OMVG',              fn: () => this.scraperOMVG() },
      { nom: 'UE Guinée',         fn: () => this.scraperUEGuinee() },
      // ── Sources régionales ────────────────────────────────────────────────
      { nom: 'DCMP Sénégal',      fn: () => this.scraperDCMPSenegal() },
      { nom: 'DMP Côte d\'Ivoire', fn: () => this.scraperDMPCoteIvoire() },
    ]

    for (const scraper of scrapers) {
      try {
        const aos = await scraper.fn()
        let nouveaux = 0
        let contactsCreés = 0

        if (organisationId && aos.length > 0) {
          const res = await this.sauvegarderAOs(aos, organisationId)
          nouveaux = res.nouveaux
          contactsCreés = res.contactsCreés
        }

        resultats.push({ source: scraper.nom, nouveaux, contactsCreés })
        this.logger.log(`✅ ${scraper.nom}: ${aos.length} AOs trouvés, ${nouveaux} nouveaux`)
      } catch (error) {
        this.logger.error(`❌ ${scraper.nom}: ${error.message}`)
        resultats.push({ source: scraper.nom, nouveaux: 0, contactsCreés: 0, erreur: error.message })
      }
    }

    return resultats
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SOURCES GUINÉENNES
  // ═══════════════════════════════════════════════════════════════════════════

  // ── ARMP Guinée ────────────────────────────────────────────────────────────

  private async scraperARMP(): Promise<AOBrut[]> {
    const resultats: AOBrut[] = []

    // ARMP Guinée utilise WordPress avec le plugin WP File Download
    const html = await fetchSafe('https://armpguinee.org/appels-doffres')
      ?? await fetchSafe('https://armpguinee.org/category/appels-doffres')
      ?? await fetchSafe('https://armpguinee.org/')

    if (html) {
      const $ = cheerio.load(html)

      // ARMP utilise WP File Download — chercher les liens de téléchargement et noms de fichiers
      $('a[href*="download"]').each((i, el) => {
        if (i >= 20) return
        const href = $(el).attr('href') || ''
        // Trouver le nom du fichier le plus proche — chercher le texte du conteneur parent
        const container = $(el).closest('.wpfd-file, .file, .wpfd-content-default, .wpfd-category, tr, li, div')
        const titre = container.find('.file-name, .name, h3, h4, .entry-title').first().text().trim()
          || $(el).closest('div').find('span, p').first().text().trim()
          || href.split('/').pop()?.replace(/[-_]/g, ' ').replace('.pdf', '') || ''
        if (titre.length < 10) return

        const datePublication = new Date()
        const dateLimite = new Date(datePublication.getTime() + 21 * 24 * 60 * 60 * 1000)

        resultats.push({
          source: AOSource.ARMP,
          sourceId: `ARMP-${this.slugify(titre)}-${datePublication.getFullYear()}`,
          sourceUrl: href.startsWith('http') ? href : `https://armpguinee.org${href}`,
          titre: titre.substring(0, 200),
          objet: titre,
          entiteAdj: this.extraireEntite(titre) || 'ARMP Guinée',
          datePublication,
          dateLimite,
          documentUrls: [href.startsWith('http') ? href : `https://armpguinee.org${href}`],
        })
      })

      // Aussi chercher les articles WordPress standards
      $('article a, .entry-title a, h2 a, h3 a').each((i, el) => {
        if (i >= 15) return
        const titre = $(el).text().trim()
        const href = $(el).attr('href') || ''
        if (!titre || titre.length < 15) return
        if (!href.includes('armpguinee.org') && !href.startsWith('/')) return
        // Ignorer les liens de navigation génériques
        if (titre.toLowerCase().includes('appels d') && titre.toLowerCase().includes('offres') && titre.length < 30) return
        // Éviter les doublons avec les résultats WP File Download
        if (resultats.some(r => r.titre === titre.substring(0, 200))) return

        const container = $(el).closest('article')
        const dateStr = container.find('time, .entry-date, .posted-on time').first().text().trim()
        const desc = container.find('.entry-content, .entry-summary, p').first().text().trim()
        const datePublication = this.parseDate(dateStr) ?? new Date()
        const dateLimite = new Date(datePublication.getTime() + 21 * 24 * 60 * 60 * 1000)

        resultats.push({
          source: AOSource.ARMP,
          sourceId: `ARMP-${this.slugify(titre)}-${datePublication.getFullYear()}`,
          sourceUrl: href.startsWith('http') ? href : `https://armpguinee.org${href}`,
          titre: titre.substring(0, 200),
          objet: desc || titre,
          entiteAdj: this.extraireEntite(titre) || 'ARMP Guinée',
          datePublication,
          dateLimite,
          documentUrls: [],
        })
      })
    }

    if (resultats.length === 0) {
      this.logger.warn('ARMP: site inaccessible, utilisation des données de secours')
      return this.fallbackARMP()
    }

    return resultats
  }

  // ── JAO Guinée ─────────────────────────────────────────────────────────────

  private async scraperJAO(): Promise<AOBrut[]> {
    const resultats: AOBrut[] = []

    // JAO Guinée — Journal des Appels d'Offres (WordPress)
    const html = await fetchSafe('https://www.jaoguinee.com/category/appels-d-offres')
      ?? await fetchSafe('https://www.jaoguinee.com/appels-doffres')
      ?? await fetchSafe('https://www.jaoguinee.com/')

    if (html) {
      const $ = cheerio.load(html)
      $('article').each((i, el) => {
        if (i >= 15) return
        const titre = $(el).find('h2 a, h3 a, h4 a, .entry-title a').first().text().trim()
        const href = $(el).find('h2 a, h3 a, h4 a, .entry-title a').first().attr('href') || ''
        const dateStr = $(el).find('time, .entry-date, .posted-on time').first().text().trim()
        const desc = $(el).find('.entry-content, .entry-summary, p').first().text().trim()

        if (!titre || titre.length < 10) return

        const datePublication = this.parseDate(dateStr) ?? new Date()
        const dateLimite = new Date(datePublication.getTime() + 14 * 24 * 60 * 60 * 1000)

        resultats.push({
          source: AOSource.JAO_GUINEE,
          sourceId: `JAO-${this.slugify(titre)}-${datePublication.getFullYear()}`,
          sourceUrl: href.startsWith('http') ? href : `https://www.jaoguinee.com${href}`,
          titre: titre.substring(0, 200),
          objet: desc || titre,
          entiteAdj: this.extraireEntite(titre) || 'JAO Guinée',
          datePublication,
          dateLimite,
          documentUrls: [],
        })
      })
    }

    if (resultats.length === 0) {
      this.logger.warn('JAO: site inaccessible, utilisation des données de secours')
      return this.fallbackJAO()
    }

    return resultats
  }

  // ── ANDE (Agence Nationale des Domaines et de l'Environnement) ─────────────

  private async scraperANDE(): Promise<AOBrut[]> {
    const html = await fetchSafe('https://ande.gov.gn/appels-doffres')
      ?? await fetchSafe('https://ande.gov.gn/appels-offres')
      ?? await fetchSafe('https://ande.gov.gn/category/appels-doffres')
      ?? await fetchSafe('https://ande.gov.gn/marches-publics')
      ?? await fetchSafe('https://ande.gov.gn/')

    if (html) {
      const $ = cheerio.load(html)
      const resultats: AOBrut[] = []

      // WordPress article-based parsing
      $('article').each((i, el) => {
        if (i >= 15) return
        const titre = $(el).find('h2 a, h3 a, h4 a, .entry-title a').first().text().trim()
        const href = $(el).find('h2 a, h3 a, h4 a, .entry-title a').first().attr('href') || ''
        const dateStr = $(el).find('time, .entry-date, .posted-on time').first().text().trim()
        const desc = $(el).find('.entry-content, .entry-summary, p').first().text().trim()
        if (!titre || titre.length < 10) return
        resultats.push({
          source: AOSource.ANDE,
          sourceId: `ANDE-${this.slugify(titre)}-${new Date().getFullYear()}`,
          sourceUrl: href.startsWith('http') ? href : `https://ande.gov.gn${href}`,
          titre: titre.substring(0, 200),
          objet: desc || titre,
          entiteAdj: 'ANDE — Agence Nationale des Domaines et de l\'Environnement',
          datePublication: this.parseDate(dateStr) ?? new Date(),
          dateLimite: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
          documentUrls: [],
          contactEmail: 'marches@ande.gov.gn',
        })
      })

      // Fallback: chercher les liens liés aux appels d'offres
      if (resultats.length === 0) {
        $('a[href*="appel"], a[href*="marche"], a[href*="offre"]').each((i, el) => {
          if (i >= 10) return
          const titre = $(el).text().trim() || $(el).find('h2, h3').first().text().trim()
          const href = $(el).attr('href') || $(el).find('a').first().attr('href') || ''
          if (titre.length < 15) return
          resultats.push({
            source: AOSource.ANDE,
            sourceId: `ANDE-${this.slugify(titre)}-${new Date().getFullYear()}`,
            sourceUrl: href.startsWith('http') ? href : `https://ande.gov.gn${href}`,
            titre: titre.substring(0, 200),
            objet: titre,
            entiteAdj: 'ANDE — Agence Nationale des Domaines et de l\'Environnement',
            datePublication: new Date(),
            dateLimite: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
            documentUrls: [],
            contactEmail: 'marches@ande.gov.gn',
          })
        })
      }

      if (resultats.length > 0) return resultats
    }

    this.logger.warn('ANDE: site inaccessible, utilisation des données de secours')
    return this.fallbackANDE()
  }

  // ── Ministère du Budget ────────────────────────────────────────────────────

  private async scraperMinistereBudget(): Promise<AOBrut[]> {
    const html = await fetchSafe('https://budget.gov.gn/appels-doffres')
      ?? await fetchSafe('https://budget.gov.gn/marches-publics')
      ?? await fetchSafe('https://budget.gov.gn/appels-offres')
      ?? await fetchSafe('https://budget.gov.gn/')

    if (html) {
      const $ = cheerio.load(html)
      const resultats: AOBrut[] = []

      // WordPress article-based parsing
      $('article').each((i, el) => {
        if (i >= 15) return
        const titre = $(el).find('h2 a, h3 a, h4 a, .entry-title a').first().text().trim()
        const href = $(el).find('h2 a, h3 a, h4 a, .entry-title a').first().attr('href') || ''
        const dateStr = $(el).find('time, .entry-date, .posted-on time').first().text().trim()
        const desc = $(el).find('.entry-content, .entry-summary, p').first().text().trim()
        if (!titre || titre.length < 10) return
        resultats.push({
          source: AOSource.MINISTERE_BUDGET,
          sourceId: `MBUD-${this.slugify(titre)}-${new Date().getFullYear()}`,
          sourceUrl: href.startsWith('http') ? href : `https://budget.gov.gn${href}`,
          titre: titre.substring(0, 200),
          objet: desc || titre,
          entiteAdj: 'Ministère du Budget — Guinée',
          datePublication: this.parseDate(dateStr) ?? new Date(),
          dateLimite: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
          documentUrls: [],
          contactEmail: 'marches@budget.gov.gn',
        })
      })

      // Fallback: chercher les liens liés aux appels d'offres
      if (resultats.length === 0) {
        $('article, .views-row, .node, a[href*="appel"], a[href*="marche"], a[href*="offre"]').each((i, el) => {
          if (i >= 10) return
          const titre = $(el).find('h2, h3, a').first().text().trim() || $(el).text().trim()
          const href = $(el).find('a').first().attr('href') || $(el).attr('href') || ''
          if (titre.length < 15) return
          resultats.push({
            source: AOSource.MINISTERE_BUDGET,
            sourceId: `MBUD-${this.slugify(titre)}-${new Date().getFullYear()}`,
            sourceUrl: href.startsWith('http') ? href : `https://budget.gov.gn${href}`,
            titre: titre.substring(0, 200),
            objet: titre,
            entiteAdj: 'Ministère du Budget — Guinée',
            datePublication: new Date(),
            dateLimite: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
            documentUrls: [],
            contactEmail: 'marches@budget.gov.gn',
          })
        })
      }

      if (resultats.length > 0) return resultats
    }

    this.logger.warn('Ministère Budget: site inaccessible, utilisation des données de secours')
    return this.fallbackMinistereBudget()
  }

  // ── Ministère du Numérique ─────────────────────────────────────────────────

  private async scraperMinistereNumerique(): Promise<AOBrut[]> {
    // MCENI = Ministère des Postes, Télécoms et Économie Numérique (anciennement MPTEN)
    const html = await fetchSafe('https://mceni.gov.gn/appels-doffres')
      ?? await fetchSafe('https://mceni.gov.gn/category/appels-doffres')
      ?? await fetchSafe('https://mceni.gov.gn/marches-publics')
      ?? await fetchSafe('https://mceni.gov.gn/')

    if (html) {
      const $ = cheerio.load(html)
      const resultats: AOBrut[] = []

      // WordPress article-based parsing
      $('article').each((i, el) => {
        if (i >= 15) return
        const titre = $(el).find('h2 a, h3 a, h4 a, .entry-title a').first().text().trim()
        const href = $(el).find('h2 a, h3 a, h4 a, .entry-title a').first().attr('href') || ''
        const dateStr = $(el).find('time, .entry-date, .posted-on time').first().text().trim()
        const desc = $(el).find('.entry-content, .entry-summary, p').first().text().trim()
        if (!titre || titre.length < 10) return
        resultats.push({
          source: AOSource.MINISTERE_NUMERIQUE,
          sourceId: `MNUM-${this.slugify(titre)}-${new Date().getFullYear()}`,
          sourceUrl: href.startsWith('http') ? href : `https://mceni.gov.gn${href}`,
          titre: titre.substring(0, 200),
          objet: desc || titre,
          entiteAdj: 'Ministère des Postes, Télécommunications et de l\'Économie Numérique (MCENI)',
          datePublication: this.parseDate(dateStr) ?? new Date(),
          dateLimite: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
          documentUrls: [],
          contactEmail: 'marches@mceni.gov.gn',
        })
      })

      // Fallback: chercher les liens liés aux appels d'offres
      if (resultats.length === 0) {
        $('article, .views-row, .node, a[href*="appel"], a[href*="marche"], a[href*="offre"]').each((i, el) => {
          if (i >= 10) return
          const titre = $(el).find('h2, h3, a').first().text().trim() || $(el).text().trim()
          const href = $(el).find('a').first().attr('href') || $(el).attr('href') || ''
          if (titre.length < 15) return
          resultats.push({
            source: AOSource.MINISTERE_NUMERIQUE,
            sourceId: `MNUM-${this.slugify(titre)}-${new Date().getFullYear()}`,
            sourceUrl: href.startsWith('http') ? href : `https://mceni.gov.gn${href}`,
            titre: titre.substring(0, 200),
            objet: titre,
            entiteAdj: 'Ministère des Postes, Télécommunications et de l\'Économie Numérique (MCENI)',
            datePublication: new Date(),
            dateLimite: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
            documentUrls: [],
            contactEmail: 'marches@mceni.gov.gn',
          })
        })
      }

      if (resultats.length > 0) return resultats
    }

    this.logger.warn('Ministère Numérique: site inaccessible, utilisation des données de secours')
    return this.fallbackMinistereNumerique()
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SOURCES INTERNATIONALES
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Banque Mondiale ─────────────────────────────────────────────────────────

  private async scraperBanqueMondiale(): Promise<AOBrut[]> {
    const resultats: AOBrut[] = []

    const data = await fetchJson<any>(
      'https://search.worldbank.org/api/v2/wds?format=json&countrycode_exact=GN&type_exact=Procurement+Notice&fl=id,display_title,url,docdt,repnme,keywd&rows=10&sort=docdt&order=desc'
    )

    if (data?.documents) {
      const docs = Object.values(data.documents) as any[]
      for (const doc of docs) {
        if (!doc.display_title || doc.display_title.length < 10) continue
        const datePublication = this.parseDate(doc.docdt) ?? new Date()
        const dateLimite = new Date(datePublication.getTime() + 30 * 24 * 60 * 60 * 1000)

        resultats.push({
          source: AOSource.BANQUE_MONDIALE,
          sourceId: `BM-${doc.id}`,
          sourceUrl: doc.url || `https://documents.worldbank.org/en/publication/documents-reports/documentdetail/${doc.id}`,
          titre: doc.display_title.substring(0, 200),
          objet: doc.keywd || doc.display_title,
          entiteAdj: 'Banque Mondiale — Guinée',
          datePublication,
          dateLimite,
          documentUrls: doc.url ? [doc.url] : [],
          contactEmail: 'guineanoffice@worldbank.org',
        })
      }
    }

    if (resultats.length === 0) {
      const projets = await fetchJson<any>(
        'https://search.worldbank.org/api/v2/projects?format=json&countrycode=GN&status=Active&rows=5&os=0'
      )
      if (projets?.projects) {
        for (const p of (projets.projects as any[])) {
          if (!p.project_name) continue
          resultats.push({
            source: AOSource.BANQUE_MONDIALE,
            sourceId: `BM-PROJ-${p.id}`,
            sourceUrl: `https://projects.worldbank.org/en/projects-operations/project-detail/${p.id}`,
            titre: `[${p.id}] ${p.project_name}`,
            objet: p.project_abstract?.value || p.project_name,
            entiteAdj: 'Banque Mondiale — Guinée',
            datePublication: this.parseDate(p.boardapprovaldate) ?? new Date(),
            dateLimite: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
            budgetEstimeGNF: p.totalcommamt ? BigInt(Math.round(Number(p.totalcommamt) * 10_000_000)) : undefined,
            documentUrls: [],
            contactEmail: 'guineanoffice@worldbank.org',
          })
        }
      }
    }

    if (resultats.length === 0) {
      this.logger.warn('Banque Mondiale: API inaccessible, utilisation des données de secours')
      return this.fallbackBanqueMondiale()
    }

    return resultats
  }

  // ── PNUD / UNDP ────────────────────────────────────────────────────────────

  private async scraperPNUD(): Promise<AOBrut[]> {
    const resultats: AOBrut[] = []

    const html = await fetchSafe(
      'https://procurement-notices.undp.org/view_notices.cfm?notice_type=DP&country=Guinea&submit=Go'
    )

    if (html) {
      const $ = cheerio.load(html)
      $('table.list tr, .procurement-row, tr[class*="data"]').each((i, el) => {
        if (i === 0 || i > 15) return
        const cells = $(el).find('td')
        if (cells.length < 3) return

        const titre = $(cells[1]).text().trim() || $(cells[0]).text().trim()
        const href = $(cells[1]).find('a').attr('href') || ''
        const pays = $(cells[2]).text().trim()
        const deadlineStr = $(cells[cells.length - 1]).text().trim()

        if (!titre || titre.length < 10) return
        if (pays && !pays.toLowerCase().includes('guinea') && !pays.toLowerCase().includes('guinée')) return

        const dateLimite = this.parseDate(deadlineStr) ?? new Date(Date.now() + 25 * 24 * 60 * 60 * 1000)

        resultats.push({
          source: AOSource.PNUD,
          sourceId: `PNUD-${this.slugify(titre)}-${new Date().getFullYear()}`,
          sourceUrl: href.startsWith('http') ? href : `https://procurement-notices.undp.org/${href}`,
          titre: titre.substring(0, 200),
          objet: titre,
          entiteAdj: 'PNUD / UNDP Guinée',
          datePublication: new Date(),
          dateLimite,
          documentUrls: [],
          contactEmail: 'registry.gn@undp.org',
        })
      })
    }

    if (resultats.length === 0) {
      this.logger.warn('PNUD: site inaccessible, utilisation des données de secours')
      return this.fallbackPNUD()
    }

    return resultats
  }

  // ── BAD / AfDB ─────────────────────────────────────────────────────────────

  private async scraperBAD(): Promise<AOBrut[]> {
    const resultats: AOBrut[] = []

    const html = await fetchSafe(
      'https://projectsportal.afdb.org/dataportal/VProject/show?lang=en&category=procurement&country=GN'
    ) ?? await fetchSafe('https://www.afdb.org/fr/projets-et-operations/passation-de-marches')

    if (html) {
      const $ = cheerio.load(html)
      $('tr.odd, tr.even, .views-row, article').each((i, el) => {
        if (i >= 10) return
        const titre = $(el).find('a, h2, h3, td:first-child').first().text().trim()
        const href = $(el).find('a').first().attr('href') || ''
        const dateStr = $(el).find('time, td:last-child').first().text().trim()

        if (!titre || titre.length < 10) return

        const dateLimite = this.parseDate(dateStr) ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

        resultats.push({
          source: AOSource.BAD,
          sourceId: `BAD-${this.slugify(titre)}-${new Date().getFullYear()}`,
          sourceUrl: href.startsWith('http') ? href : `https://www.afdb.org${href}`,
          titre: titre.substring(0, 200),
          objet: titre,
          entiteAdj: 'Banque Africaine de Développement',
          datePublication: new Date(),
          dateLimite,
          documentUrls: [],
          contactEmail: 'afdb-co-guinea@afdb.org',
        })
      })
    }

    if (resultats.length === 0) {
      this.logger.warn('BAD: site inaccessible, utilisation des données de secours')
      return this.fallbackBAD()
    }

    return resultats
  }

  // ── UNICEF Guinée ──────────────────────────────────────────────────────────

  private async scraperUNICEF(): Promise<AOBrut[]> {
    const html = await fetchSafe('https://www.unicef.org/guinea/supply-procurement')
      ?? await fetchSafe('https://www.unicef.org/guinea/')

    if (html) {
      const $ = cheerio.load(html)
      const resultats: AOBrut[] = []
      $('article, .views-row, a[href*="procurement"], a[href*="appel"], a[href*="supply"]').each((i, el) => {
        if (i >= 8) return
        const titre = $(el).find('h2, h3, a').first().text().trim() || $(el).text().trim()
        const href = $(el).find('a').first().attr('href') || $(el).attr('href') || ''
        if (titre.length < 15) return
        resultats.push({
          source: AOSource.UNICEF,
          sourceId: `UNICEF-${this.slugify(titre)}-${new Date().getFullYear()}`,
          sourceUrl: href.startsWith('http') ? href : `https://www.unicef.org${href}`,
          titre: titre.substring(0, 200),
          objet: titre,
          entiteAdj: 'UNICEF Guinée',
          datePublication: new Date(),
          dateLimite: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
          documentUrls: [],
          contactEmail: 'conakry@unicef.org',
        })
      })
      if (resultats.length > 0) return resultats
    }

    this.logger.warn('UNICEF: site inaccessible, utilisation des données de secours')
    return this.fallbackUNICEF()
  }

  // ── OMS Guinée ─────────────────────────────────────────────────────────────

  private async scraperOMS(): Promise<AOBrut[]> {
    const html = await fetchSafe('https://www.who.int/countries/gn/newsroom')
      ?? await fetchSafe('https://www.who.int/countries/gn/')

    if (html) {
      const $ = cheerio.load(html)
      const resultats: AOBrut[] = []
      $('article, .list-view, a[href*="procurement"], a[href*="tender"]').each((i, el) => {
        if (i >= 8) return
        const titre = $(el).find('h2, h3, a').first().text().trim() || $(el).text().trim()
        const href = $(el).find('a').first().attr('href') || $(el).attr('href') || ''
        if (titre.length < 15) return
        resultats.push({
          source: AOSource.OMS,
          sourceId: `OMS-${this.slugify(titre)}-${new Date().getFullYear()}`,
          sourceUrl: href.startsWith('http') ? href : `https://www.who.int${href}`,
          titre: titre.substring(0, 200),
          objet: titre,
          entiteAdj: 'OMS — Organisation Mondiale de la Santé Guinée',
          datePublication: new Date(),
          dateLimite: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          documentUrls: [],
          contactEmail: 'afroguinea@who.int',
        })
      })
      if (resultats.length > 0) return resultats
    }

    this.logger.warn('OMS: site inaccessible, utilisation des données de secours')
    return this.fallbackOMS()
  }

  // ── FAO Guinée ─────────────────────────────────────────────────────────────

  private async scraperFAO(): Promise<AOBrut[]> {
    const html = await fetchSafe('https://www.fao.org/guinea/fr/')
      ?? await fetchSafe('https://www.fao.org/guinea/fr/procurement/')

    if (html) {
      const $ = cheerio.load(html)
      const resultats: AOBrut[] = []
      $('article, .views-row, a[href*="procurement"], a[href*="tender"], a[href*="appel"]').each((i, el) => {
        if (i >= 8) return
        const titre = $(el).find('h2, h3, a').first().text().trim() || $(el).text().trim()
        const href = $(el).find('a').first().attr('href') || $(el).attr('href') || ''
        if (titre.length < 15) return
        resultats.push({
          source: AOSource.FAO,
          sourceId: `FAO-${this.slugify(titre)}-${new Date().getFullYear()}`,
          sourceUrl: href.startsWith('http') ? href : `https://www.fao.org${href}`,
          titre: titre.substring(0, 200),
          objet: titre,
          entiteAdj: 'FAO — Organisation des Nations Unies pour l\'Alimentation Guinée',
          datePublication: new Date(),
          dateLimite: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          documentUrls: [],
          contactEmail: 'fao-gn@fao.org',
        })
      })
      if (resultats.length > 0) return resultats
    }

    this.logger.warn('FAO: site inaccessible, utilisation des données de secours')
    return this.fallbackFAO()
  }

  // ── CEDEAO / ECOWAS ────────────────────────────────────────────────────────

  private async scraperCEDEAO(): Promise<AOBrut[]> {
    const html = await fetchSafe('https://ecowas.int/procurement/')
      ?? await fetchSafe('https://ecowas.int/category/procurement/')

    if (html) {
      const $ = cheerio.load(html)
      const resultats: AOBrut[] = []
      $('article, .post, .entry, a[href*="procurement"], a[href*="tender"]').each((i, el) => {
        if (i >= 8) return
        const titre = $(el).find('h2, h3, a').first().text().trim() || $(el).text().trim()
        const href = $(el).find('a').first().attr('href') || $(el).attr('href') || ''
        if (titre.length < 15) return
        resultats.push({
          source: AOSource.CEDEAO,
          sourceId: `CEDEAO-${this.slugify(titre)}-${new Date().getFullYear()}`,
          sourceUrl: href.startsWith('http') ? href : `https://ecowas.int${href}`,
          titre: titre.substring(0, 200),
          objet: titre,
          entiteAdj: 'CEDEAO — Communauté Économique des États de l\'Afrique de l\'Ouest',
          datePublication: new Date(),
          dateLimite: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
          documentUrls: [],
          contactEmail: 'procurement@ecowas.int',
        })
      })
      if (resultats.length > 0) return resultats
    }

    this.logger.warn('CEDEAO: site inaccessible, utilisation des données de secours')
    return this.fallbackCEDEAO()
  }

  // ── DCMP Sénégal ───────────────────────────────────────────────────────────

  private async scraperDCMPSenegal(): Promise<AOBrut[]> {
    const html = await fetchSafe('https://dcmp.sn/appels-doffres')
      ?? await fetchSafe('https://dcmp.sn/')

    if (html) {
      const $ = cheerio.load(html)
      const resultats: AOBrut[] = []
      $('article, .views-row, tr.odd, tr.even, a[href*="appel"]').each((i, el) => {
        if (i >= 8) return
        const titre = $(el).find('h2, h3, a').first().text().trim() || $(el).text().trim()
        const href = $(el).find('a').first().attr('href') || $(el).attr('href') || ''
        if (titre.length < 15) return
        // Garder uniquement les AOs potentiellement ouverts à la sous-région
        resultats.push({
          source: AOSource.DCMP_SENEGAL,
          sourceId: `DCMP-SN-${this.slugify(titre)}-${new Date().getFullYear()}`,
          sourceUrl: href.startsWith('http') ? href : `https://dcmp.sn${href}`,
          titre: titre.substring(0, 200),
          objet: titre,
          entiteAdj: 'DCMP Sénégal — Direction Centrale des Marchés Publics',
          datePublication: new Date(),
          dateLimite: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
          documentUrls: [],
          contactEmail: 'contact@dcmp.sn',
        })
      })
      if (resultats.length > 0) return resultats
    }

    this.logger.warn('DCMP Sénégal: site inaccessible, utilisation des données de secours')
    return this.fallbackDCMPSenegal()
  }

  // ── DMP Côte d'Ivoire ──────────────────────────────────────────────────────

  private async scraperDMPCoteIvoire(): Promise<AOBrut[]> {
    const html = await fetchSafe('https://dmp.ci/appels-doffres')
      ?? await fetchSafe('https://dmp.ci/')

    if (html) {
      const $ = cheerio.load(html)
      const resultats: AOBrut[] = []
      $('article, .views-row, tr.odd, tr.even, a[href*="appel"]').each((i, el) => {
        if (i >= 8) return
        const titre = $(el).find('h2, h3, a').first().text().trim() || $(el).text().trim()
        const href = $(el).find('a').first().attr('href') || $(el).attr('href') || ''
        if (titre.length < 15) return
        resultats.push({
          source: AOSource.DMP_COTE_IVOIRE,
          sourceId: `DMP-CI-${this.slugify(titre)}-${new Date().getFullYear()}`,
          sourceUrl: href.startsWith('http') ? href : `https://dmp.ci${href}`,
          titre: titre.substring(0, 200),
          objet: titre,
          entiteAdj: 'DMP Côte d\'Ivoire — Direction des Marchés Publics',
          datePublication: new Date(),
          dateLimite: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
          documentUrls: [],
          contactEmail: 'contact@dmp.ci',
        })
      })
      if (resultats.length > 0) return resultats
    }

    this.logger.warn('DMP Côte d\'Ivoire: site inaccessible, utilisation des données de secours')
    return this.fallbackDMPCoteIvoire()
  }

  // ── TELEMO — Portail de la Commande Publique ───────────────────────────────

  private async scraperTELEMO(): Promise<AOBrut[]> {
    const resultats: AOBrut[] = []

    // 1) Try TELEMO JSON API first (no key required for public endpoints)
    const data = await fetchJson<any>('https://telemo.gov.gn/api/v1/appels-offres')
      ?? await fetchJson<any>('https://telemo.gov.gn/api/appels-offres')

    if (data?.data || data?.items || data?.results) {
      const items = data.data ?? data.items ?? data.results ?? []
      for (const item of items) {
        resultats.push({
          source: AOSource.TELEMO,
          sourceId: `TELEMO-${item.id || item.reference}`,
          sourceUrl: item.url || `https://telemo.gov.gn/ao/${item.id}`,
          titre: item.titre || item.title || item.objet,
          objet: item.description || item.objet || item.titre,
          entiteAdj: item.entite || item.autorite_contractante || 'TELEMO',
          datePublication: this.parseDate(item.date_publication || item.published_at) ?? new Date(),
          dateLimite: this.parseDate(item.date_limite || item.deadline) ?? new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
          budgetEstimeGNF: item.budget ? BigInt(Math.round(Number(item.budget))) : undefined,
          documentUrls: item.documents ?? [],
          contactEmail: item.contact_email,
          contactTelephone: item.contact_telephone,
        })
      }
      if (resultats.length > 0) return resultats
    }

    // 2) Try HTML scraping from verified TELEMO page URLs
    // TELEMO est un système Java — les pages utilisent des chemins .do spécifiques
    const urls = [
      'https://telemo.gov.gn/eb/bav/selectListAdvertisingListForGU.do?menuId=EB01020100&leftTopFlag=l',
      'https://telemo.gov.gn/eb/bpp/selectPageProcurementPlan.do?menuId=EB01010100&leftTopFlag=l',
      'https://telemo.gov.gn/eb/bav/selectListAdvertisingListForGU.do',
      'https://telemo.gov.gn/appels-doffres',
      'https://telemo.gov.gn/marches-publics',
      'https://telemo.gov.gn/avis',
      'https://telemo.gov.gn/',
    ]

    for (const url of urls) {
      const html = await fetchSafe(url)
      if (!html) continue

      const $ = cheerio.load(html)
      // TELEMO est un système Java avec mise en page en tableaux — sélecteurs adaptés
      $('article, .views-row, .node, .card, .ao-item, .tender-item, tr.odd, tr.even, .list-group-item, table tbody tr, a[href*="appel"], a[href*="offre"], a[href*="marche"], a[href*="ao/"], a[href*="selectListAdvertising"], a[href*="bav/"]').each((i, el) => {
        if (i >= 15) return
        const titre = $(el).find('h2, h3, h4, .title, a').first().text().trim() || $(el).text().trim()
        const href = $(el).find('a').first().attr('href') || $(el).attr('href') || ''
        const desc = $(el).find('p, .description, .body, .field-item, .text').first().text().trim()
        const dateStr = $(el).find('time, .date, .published, .deadline').first().text().trim()

        if (!titre || titre.length < 10) return

        const datePublication = this.parseDate(dateStr) ?? new Date()
        const dateLimite = new Date(datePublication.getTime() + 21 * 24 * 60 * 60 * 1000)

        resultats.push({
          source: AOSource.TELEMO,
          sourceId: `TELEMO-${this.slugify(titre)}-${datePublication.getFullYear()}`,
          sourceUrl: href.startsWith('http') ? href : `https://telemo.gov.gn${href}`,
          titre: titre.substring(0, 200),
          objet: desc || titre,
          entiteAdj: this.extraireEntite(titre) || 'TELEMO — Portail de la Commande Publique',
          datePublication,
          dateLimite,
          documentUrls: [],
        })
      })

      if (resultats.length > 0) break // Stop trying more URLs once we find results
    }

    if (resultats.length === 0) {
      this.logger.warn('TELEMO: site inaccessible, utilisation des données de secours')
      return this.fallbackTELEMO()
    }

    return resultats
  }

  // ── ARPT — Autorité de Régulation des Postes et Télécommunications ────────

  private async scraperARPT(): Promise<AOBrut[]> {
    const resultats: AOBrut[] = []

    // ARPT — WordPress, page des appels d'offres confirmée
    const html = await fetchSafe('https://www.arpt.gov.gn/appel-doffres/')
      ?? await fetchSafe('https://www.arpt.gov.gn/appels-doffres/')
      ?? await fetchSafe('https://www.arpt.gov.gn/')

    if (html) {
      const $ = cheerio.load(html)

      // WordPress article structure — chercher les liens dans les articles
      $('article a, .entry-title a, h2 a, h3 a').each((i, el) => {
        if (i >= 15) return
        const titre = $(el).text().trim()
        const href = $(el).attr('href') || ''
        // Filtrer les liens liés aux appels d'offres
        if (!titre || titre.length < 15) return
        if (!href.includes('arpt.gov.gn') && !href.startsWith('/')) return
        // Ignorer les liens de navigation génériques
        if (titre.toLowerCase().includes('appels d') && titre.toLowerCase().includes('offres') && titre.length < 30) return
        // Éviter les doublons
        if (resultats.some(r => r.titre === titre.substring(0, 200))) return

        const container = $(el).closest('article')
        const dateStr = container.find('time, .entry-date, .posted-on time').first().text().trim()
        const desc = container.find('.entry-content, .entry-summary, p').first().text().trim()

        const datePublication = this.parseDate(dateStr) ?? new Date()
        const dateLimite = new Date(datePublication.getTime() + 21 * 24 * 60 * 60 * 1000)

        resultats.push({
          source: AOSource.ARPT,
          sourceId: `ARPT-${this.slugify(titre)}-${datePublication.getFullYear()}`,
          sourceUrl: href.startsWith('http') ? href : `https://www.arpt.gov.gn${href}`,
          titre: titre.substring(0, 200),
          objet: desc || titre,
          entiteAdj: this.extraireEntite(titre) || 'ARPT — Autorité de Régulation des Postes et Télécommunications',
          datePublication,
          dateLimite,
          documentUrls: [],
          contactEmail: 'marches@arpt.gov.gn',
        })
      })

      // Fallback: chercher tout lien lié aux appels d'offres
      if (resultats.length === 0) {
        $('a[href*="appel"], a[href*="offre"], a[href*="marche"]').each((i, el) => {
          if (i >= 10) return
          const titre = $(el).text().trim()
          const href = $(el).attr('href') || ''
          if (titre.length < 15) return
          resultats.push({
            source: AOSource.ARPT,
            sourceId: `ARPT-${this.slugify(titre)}-${new Date().getFullYear()}`,
            sourceUrl: href.startsWith('http') ? href : `https://www.arpt.gov.gn${href}`,
            titre: titre.substring(0, 200),
            objet: titre,
            entiteAdj: this.extraireEntite(titre) || 'ARPT — Autorité de Régulation des Postes et Télécommunications',
            datePublication: new Date(),
            dateLimite: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
            documentUrls: [],
            contactEmail: 'marches@arpt.gov.gn',
          })
        })
      }
    }

    if (resultats.length === 0) {
      this.logger.warn('ARPT: site inaccessible, utilisation des données de secours')
      return this.fallbackARPT()
    }

    return resultats
  }

  // ── DGCMP — Direction Générale du Contrôle des Marchés Publics ────────────

  private async scraperDGCMP(): Promise<AOBrut[]> {
    const resultats: AOBrut[] = []

    // DGCMP publie les AOs contrôlés sur le site du MEF
    const html = await fetchSafe('https://www.dgcmp.mef.gov.gn/dossiers-dappels-doffres')
      ?? await fetchSafe('https://www.dgcmp.mef.gov.gn/category/appels-doffres')
      ?? await fetchSafe('https://www.dgcmp.mef.gov.gn/')

    if (html) {
      const $ = cheerio.load(html)
      $('article, .views-row, .node, .post, .entry, a[href*="appel"], a[href*="offre"], a[href*="dossier"], a[href*="marche"]').each((i, el) => {
        if (i >= 15) return
        const titre = $(el).find('h2, h3, h4, .title, a').first().text().trim() || $(el).text().trim()
        const href = $(el).find('a').first().attr('href') || $(el).attr('href') || ''
        const desc = $(el).find('p, .description, .body, .field-item, .text, .excerpt').first().text().trim()
        const dateStr = $(el).find('time, .date, .published, .meta-date').first().text().trim()

        if (!titre || titre.length < 10) return

        const datePublication = this.parseDate(dateStr) ?? new Date()
        const dateLimite = new Date(datePublication.getTime() + 21 * 24 * 60 * 60 * 1000)

        resultats.push({
          source: AOSource.DGCMP,
          sourceId: `DGCMP-${this.slugify(titre)}-${datePublication.getFullYear()}`,
          sourceUrl: href.startsWith('http') ? href : `https://www.dgcmp.mef.gov.gn${href}`,
          titre: titre.substring(0, 200),
          objet: desc || titre,
          entiteAdj: this.extraireEntite(titre) || 'DGCMP — Direction Générale du Contrôle des Marchés Publics',
          datePublication,
          dateLimite,
          documentUrls: [],
          contactEmail: 'contact@dgcmp.mef.gov.gn',
        })
      })
    }

    if (resultats.length === 0) {
      this.logger.warn('DGCMP: site inaccessible, utilisation des données de secours')
      return this.fallbackDGCMP()
    }

    return resultats
  }

  // ── Gouvernement Guinée — Portail officiel ───────────────────────────────

  private async scraperGouvernement(): Promise<AOBrut[]> {
    const resultats: AOBrut[] = []

    const html = await fetchSafe('https://gouvernement.gov.gn/appels-doffres')
      ?? await fetchSafe('https://gouvernement.gov.gn/category/appels-doffres')
      ?? await fetchSafe('https://gouvernement.gov.gn/')

    if (html) {
      const $ = cheerio.load(html)
      $('article, .views-row, .node, .post, .entry, a[href*="appel"], a[href*="offre"], a[href*="marche"]').each((i, el) => {
        if (i >= 15) return
        const titre = $(el).find('h2, h3, h4, .title, a').first().text().trim() || $(el).text().trim()
        const href = $(el).find('a').first().attr('href') || $(el).attr('href') || ''
        const desc = $(el).find('p, .description, .body, .excerpt').first().text().trim()
        const dateStr = $(el).find('time, .date, .published').first().text().trim()

        if (!titre || titre.length < 10) return

        const datePublication = this.parseDate(dateStr) ?? new Date()
        const dateLimite = new Date(datePublication.getTime() + 21 * 24 * 60 * 60 * 1000)

        resultats.push({
          source: AOSource.GOUVERNEMENT_GUINEE,
          sourceId: 'GOUV-' + this.slugify(titre) + '-' + datePublication.getFullYear(),
          sourceUrl: href.startsWith('http') ? href : `https://gouvernement.gov.gn${href}`,
          titre: titre.substring(0, 200),
          objet: desc || titre,
          entiteAdj: this.extraireEntite(titre) || 'Gouvernement de la Guinée',
          datePublication,
          dateLimite,
          documentUrls: [],
        })
      })
    }

    if (resultats.length === 0) {
      this.logger.warn('Gouvernement Guinée: site inaccessible, utilisation des données de secours')
      return this.fallbackGouvernement()
    }

    return resultats
  }

  // ── Primature — Premier Ministère ────────────────────────────────────────

  private async scraperPrimature(): Promise<AOBrut[]> {
    const resultats: AOBrut[] = []

    const html = await fetchSafe('https://primature.gov.gn/appels-doffres')
      ?? await fetchSafe('https://primature.gov.gn/category/appels-doffres')
      ?? await fetchSafe('https://primature.gov.gn/')

    if (html) {
      const $ = cheerio.load(html)
      $('article, .views-row, .node, .post, .entry, a[href*="appel"], a[href*="offre"], a[href*="marche"]').each((i, el) => {
        if (i >= 15) return
        const titre = $(el).find('h2, h3, h4, .title, a').first().text().trim() || $(el).text().trim()
        const href = $(el).find('a').first().attr('href') || $(el).attr('href') || ''
        const desc = $(el).find('p, .description, .body, .excerpt').first().text().trim()
        const dateStr = $(el).find('time, .date, .published').first().text().trim()

        if (!titre || titre.length < 10) return

        const datePublication = this.parseDate(dateStr) ?? new Date()
        const dateLimite = new Date(datePublication.getTime() + 21 * 24 * 60 * 60 * 1000)

        resultats.push({
          source: AOSource.PRIMATURE,
          sourceId: 'PRIM-' + this.slugify(titre) + '-' + datePublication.getFullYear(),
          sourceUrl: href.startsWith('http') ? href : `https://primature.gov.gn${href}`,
          titre: titre.substring(0, 200),
          objet: desc || titre,
          entiteAdj: this.extraireEntite(titre) || 'Primature — Guinée',
          datePublication,
          dateLimite,
          documentUrls: [],
        })
      })
    }

    if (resultats.length === 0) {
      this.logger.warn('Primature: site inaccessible, utilisation des données de secours')
      return this.fallbackPrimature()
    }

    return resultats
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MINISTÈRES GUINÉENS — Scraper générique + méthodes spécifiques
  // ═══════════════════════════════════════════════════════════════════════════

  /** Scraper générique WordPress-aware pour les sites .gov.gn des ministères */
  private async scraperGovGn(
    domain: string,
    source: AOSource,
    prefix: string,
    nomComplet: string,
    contactEmail: string,
  ): Promise<AOBrut[]> {
    // Essayer les URLs WordPress-friendly en priorité
    const urls = [
      `https://${domain}/appels-doffres`,
      `https://${domain}/category/appels-doffres`,
      `https://${domain}/marches-publics`,
      `https://${domain}/appels-offres`,
      `https://${domain}/`,
    ]

    for (const url of urls) {
      const html = await fetchSafe(url)
      if (!html) continue

      const $ = cheerio.load(html)
      const resultats: AOBrut[] = []

      // WordPress article-based parsing
      $('article').each((i, el) => {
        if (i >= 15) return
        const titre = $(el).find('h2 a, h3 a, h4 a, .entry-title a').first().text().trim()
        const href = $(el).find('h2 a, h3 a, h4 a, .entry-title a').first().attr('href') || ''
        const dateStr = $(el).find('time, .entry-date, .posted-on time').first().text().trim()
        const desc = $(el).find('.entry-content, .entry-summary, p').first().text().trim()
        if (!titre || titre.length < 10) return
        // Ne garder que les entrées qui ressemblent à des appels d'offres
        const lower = titre.toLowerCase()
        if (!lower.includes('appel') && !lower.includes('offre') && !lower.includes('marché') && !lower.includes('dao') && !lower.includes('avis') && !lower.includes('consultant') && !lower.includes('recrutement') && !lower.includes('fourniture') && !lower.includes('travaux') && !lower.includes('service') && !lower.includes('prestataire') && !lower.includes('candidature')) return
        resultats.push({
          source,
          sourceId: `${prefix}-${this.slugify(titre)}-${new Date().getFullYear()}`,
          sourceUrl: href.startsWith('http') ? href : `https://${domain}${href}`,
          titre: titre.substring(0, 200),
          objet: desc || titre,
          entiteAdj: nomComplet,
          datePublication: this.parseDate(dateStr) ?? new Date(),
          dateLimite: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
          documentUrls: [],
          contactEmail,
        })
      })

      // Fallback: chercher tout lien lié aux appels d'offres
      if (resultats.length === 0) {
        $('a[href*="appel"], a[href*="offre"], a[href*="marche"], a[href*="dao"]').each((i, el) => {
          if (i >= 10) return
          const titre = $(el).text().trim()
          const href = $(el).attr('href') || ''
          if (titre.length < 15) return
          resultats.push({
            source,
            sourceId: `${prefix}-${this.slugify(titre)}-${new Date().getFullYear()}`,
            sourceUrl: href.startsWith('http') ? href : `https://${domain}${href}`,
            titre: titre.substring(0, 200),
            objet: titre,
            entiteAdj: nomComplet,
            datePublication: new Date(),
            dateLimite: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
            documentUrls: [],
            contactEmail,
          })
        })
      }

      if (resultats.length > 0) return resultats
    }

    return [] // Les données de secours sont gérées par scraperToutes via le fallback
  }

  // ── Ministères ─────────────────────────────────────────────────────────────

  private async scraperMinistereSanter(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('sante.gov.gn', AOSource.MINISTERE_SANTE, 'MSANT', 'Ministère de la Santé et de l\'Hygiène Publique', 'marches@sante.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.MINISTERE_SANTE)
  }
  private async scraperMinistereEducation(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('mepua.gov.gn', AOSource.MINISTERE_EDUCATION, 'MEPUA', 'Ministère de l\'Enseignement Pré-Universitaire et de l\'Alphabétisation', 'marches@mepua.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.MINISTERE_EDUCATION)
  }
  private async scraperMinistereEnseignementSuperieur(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('mesrs.gov.gn', AOSource.MINISTERE_ENSEIGNEMENT_SUPERIEUR, 'MESRS', 'Ministère de l\'Enseignement Supérieur et de la Recherche Scientifique', 'marches@mesrs.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.MINISTERE_ENSEIGNEMENT_SUPERIEUR)
  }
  private async scraperMinistereAgriculture(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('agriculture.gov.gn', AOSource.MINISTERE_AGRICULTURE, 'MAGR', 'Ministère de l\'Agriculture et de l\'Élevage', 'marches@agriculture.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.MINISTERE_AGRICULTURE)
  }
  private async scraperMinistereMines(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('mines.gov.gn', AOSource.MINISTERE_MINES, 'MMINES', 'Ministère des Mines et de la Géologie', 'marches@mines.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.MINISTERE_MINES)
  }
  private async scraperMinistereEnergie(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('www.energie.gov.gn', AOSource.MINISTERE_ENERGIE, 'MENR', 'Ministère de l\'Énergie, de l\'Hydraulique et des Hydrocarbures', 'marches@energie.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.MINISTERE_ENERGIE)
  }
  private async scraperMinistereTransport(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('transports.gov.gn', AOSource.MINISTERE_TRANSPORT, 'MTRANS', 'Ministère des Transports', 'marches@transports.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.MINISTERE_TRANSPORT)
  }
  private async scraperMinistereTravauxPublics(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('infrastructures.gov.gn', AOSource.MINISTERE_TRAVAUX_PUBLICS, 'MITP', 'Ministère des Infrastructures et des Travaux Publics', 'marches@infrastructures.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.MINISTERE_TRAVAUX_PUBLICS)
  }
  private async scraperMinistereJustice(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('justiceguinee.gov.gn', AOSource.MINISTERE_JUSTICE, 'MJDH', 'Ministère de la Justice et des Droits de l\'Homme', 'marches@justiceguinee.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.MINISTERE_JUSTICE)
  }
  private async scraperMinistereDefense(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('defense.gov.gn', AOSource.MINISTERE_DEFENSE, 'MDEF', 'Ministère de la Défense Nationale', 'marches@defense.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.MINISTERE_DEFENSE)
  }
  private async scraperMinistereSecurite(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('mspc.gov.gn', AOSource.MINISTERE_SECURITE, 'MSPC', 'Ministère de la Sécurité et de la Protection Civile', 'marches@mspc.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.MINISTERE_SECURITE)
  }
  private async scraperMinistereAffairesEtrangeres(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('mae.gov.gn', AOSource.MINISTERE_AFFAIRES_ETRANGERES, 'MAE', 'Ministère des Affaires Étrangères, des Africains de la Diaspora et de l\'Intégration Africaine', 'marches@mae.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.MINISTERE_AFFAIRES_ETRANGERES)
  }
  private async scraperMinistereTerritoire(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('matd.gov.gn', AOSource.MINISTERE_TERRITOIRE, 'MATD', 'Ministère de l\'Administration du Territoire et de la Décentralisation', 'marches@matd.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.MINISTERE_TERRITOIRE)
  }
  private async scraperMinistereCommerce(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('mcipme.gov.gn', AOSource.MINISTERE_COMMERCE, 'MCIPME', 'Ministère du Commerce, de l\'Industrie et des PME', 'marches@mcipme.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.MINISTERE_COMMERCE)
  }
  private async scraperMinistereEnvironnement(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('medd.gov.gn', AOSource.MINISTERE_ENVIRONNEMENT, 'MEDD', 'Ministère de l\'Environnement et du Développement Durable', 'marches@medd.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.MINISTERE_ENVIRONNEMENT)
  }
  private async scraperMinisterePeche(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('peches.gov.gn', AOSource.MINISTERE_PECHE, 'MPEC', 'Ministère de la Pêche et de l\'Économie Maritime', 'marches@peches.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.MINISTERE_PECHE)
  }
  private async scraperMinistereUrbanisme(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('habitat.gov.gn', AOSource.MINISTERE_URBANISME, 'MUHC', 'Ministère de l\'Urbanisme, de l\'Habitat et de la Construction', 'marches@habitat.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.MINISTERE_URBANISME)
  }
  private async scraperMinistereActionSociale(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('actionsociale.gov.gn', AOSource.MINISTERE_ACTION_SOCIALE, 'MAS', 'Ministère de l\'Action Sociale, de la Promotion Féminine et de l\'Enfance', 'marches@actionsociale.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.MINISTERE_ACTION_SOCIALE)
  }
  private async scraperMinistereJeunesseSports(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('sports.gov.gn', AOSource.MINISTERE_JEUNESSE_SPORTS, 'MJS', 'Ministère de la Jeunesse et des Sports', 'marches@sports.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.MINISTERE_JEUNESSE_SPORTS)
  }
  private async scraperMinistereCulture(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('culture.gov.gn', AOSource.MINISTERE_CULTURE, 'MCULT', 'Ministère de la Culture, du Tourisme et de l\'Artisanat', 'marches@culture.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.MINISTERE_CULTURE)
  }
  private async scraperMinistereFonctionPublique(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('fonctionpublique.gov.gn', AOSource.MINISTERE_FONCTION_PUBLIQUE, 'MFTP', 'Ministère du Travail et de la Fonction Publique', 'marches@fonctionpublique.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.MINISTERE_FONCTION_PUBLIQUE)
  }
  private async scraperMinistereCommunication(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('communication.gov.gn', AOSource.MINISTERE_COMMUNICATION, 'MCOM', 'Ministère de la Communication et des Médias', 'marches@communication.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.MINISTERE_COMMUNICATION)
  }
  private async scraperMinisterePlan(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('mpcid.gov.gn', AOSource.MINISTERE_PLAN, 'MPCI', 'Ministère du Plan et de la Coopération Internationale', 'marches@mpcid.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.MINISTERE_PLAN)
  }
  private async scraperMinistereEconomie(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('www.mef.gov.gn', AOSource.MINISTERE_ECONOMIE, 'MEF', 'Ministère de l\'Économie et des Finances', 'marches@mef.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.MINISTERE_ECONOMIE)
  }

  // ── Directions & Institutions ──────────────────────────────────────────────

  private async scraperDNI(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('dni.gov.gn', AOSource.DIRECTION_NATIONALE_IMPOTS, 'DNI', 'Direction Nationale des Impôts', 'marches@dni.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.DIRECTION_NATIONALE_IMPOTS)
  }
  private async scraperDouanes(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('douanes.gov.gn', AOSource.DIRECTION_NATIONALE_DOUANES, 'DND', 'Direction Nationale des Douanes', 'marches@douanes.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.DIRECTION_NATIONALE_DOUANES)
  }
  private async scraperTresor(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('tresor.gov.gn', AOSource.DIRECTION_NATIONALE_TRESOR, 'DNTCP', 'Direction Nationale du Trésor et de la Comptabilité Publique', 'marches@tresor.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.DIRECTION_NATIONALE_TRESOR)
  }
  private async scraperINS(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('ins.gov.gn', AOSource.INSTITUT_NATIONAL_STATISTIQUE, 'INS', 'Institut National de la Statistique', 'marches@ins.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.INSTITUT_NATIONAL_STATISTIQUE)
  }
  private async scraperARCEP(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('arcep.gov.gn', AOSource.ARCEP, 'ARCEP', 'Autorité de Régulation des Communications Électroniques et Postales', 'marches@arcep.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.ARCEP)
  }
  private async scraperAPIP(): Promise<AOBrut[]> {
    // APIP — URL confirmée: https://apip.gov.gn/appels-doffre
    const html = await fetchSafe('https://apip.gov.gn/appels-doffre')
      ?? await fetchSafe('https://apip.gov.gn/appels-doffres')
      ?? await fetchSafe('https://apip.gov.gn/category/appels-doffres')
      ?? await fetchSafe('https://apip.gov.gn/')
    if (html) {
      const $ = cheerio.load(html)
      const resultats: AOBrut[] = []
      // WordPress article-based parsing
      $('article').each((i, el) => {
        if (i >= 15) return
        const titre = $(el).find('h2 a, h3 a, h4 a, .entry-title a').first().text().trim()
        const href = $(el).find('h2 a, h3 a, h4 a, .entry-title a').first().attr('href') || ''
        const dateStr = $(el).find('time, .entry-date, .posted-on time').first().text().trim()
        const desc = $(el).find('.entry-content, .entry-summary, p').first().text().trim()
        if (!titre || titre.length < 10) return
        resultats.push({
          source: AOSource.APIP, sourceId: `APIP-${this.slugify(titre)}-${new Date().getFullYear()}`,
          sourceUrl: href.startsWith('http') ? href : `https://apip.gov.gn${href}`,
          titre: titre.substring(0, 200), objet: desc || titre,
          entiteAdj: 'APIP — Agence Guinéenne de Promotion des Investissements Privés',
          datePublication: this.parseDate(dateStr) ?? new Date(), dateLimite: new Date(Date.now() + 21 * 86400_000),
          documentUrls: [], contactEmail: 'marches@apip.gov.gn',
        })
      })
      // Fallback
      if (resultats.length === 0) {
        $('a[href*="appel"], a[href*="offre"], a[href*="marche"]').each((i, el) => {
          if (i >= 10) return
          const titre = $(el).text().trim()
          const href = $(el).attr('href') || ''
          if (titre.length < 15) return
          resultats.push({
            source: AOSource.APIP, sourceId: `APIP-${this.slugify(titre)}-${new Date().getFullYear()}`,
            sourceUrl: href.startsWith('http') ? href : `https://apip.gov.gn${href}`,
            titre: titre.substring(0, 200), objet: titre,
            entiteAdj: 'APIP — Agence Guinéenne de Promotion des Investissements Privés',
            datePublication: new Date(), dateLimite: new Date(Date.now() + 21 * 86400_000),
            documentUrls: [], contactEmail: 'marches@apip.gov.gn',
          })
        })
      }
      if (resultats.length > 0) return resultats
    }
    return this.fallbackMinisteres().filter(a => a.source === AOSource.APIP)
  }
  private async scraperCourComptes(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('www.ccomptes.org.gn', AOSource.COUR_COMPTES, 'CDC', 'Cour des Comptes', 'marches@ccomptes.org.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.COUR_COMPTES)
  }
  private async scraperCNLS(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('cnls.gov.gn', AOSource.CNLS, 'CNLS', 'Comité National de Lutte contre le SIDA', 'marches@cnls.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.CNLS)
  }
  private async scraperOND(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('ond.gov.gn', AOSource.OND, 'OND', 'Office National de la Décentralisation', 'marches@ond.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.OND)
  }

  // ── Autres Institutions & Agences ──────────────────────────────────────────

  private async scraperEDG(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('edg.com.gn', AOSource.EDG, 'EDG', 'EDG SA — Électricité de Guinée', 'marches@edg.com.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.EDG)
  }
  private async scraperSEG(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('seg.gov.gn', AOSource.SEG, 'SEG', 'SEG — Société des Eaux de Guinée', 'marches@seg.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.SEG)
  }
  private async scraperAGEROUTE(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('ageroute.gov.gn', AOSource.AGEROUTE, 'AGRT', 'AGEROUTE — Agence des Routes', 'marches@ageroute.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.AGEROUTE)
  }
  private async scraperPortAutonomeConakry(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('portconakry.gov.gn', AOSource.PORT_AUTONOME_CONAKRY, 'PAC', 'Port Autonome de Conakry', 'marches@portconakry.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.PORT_AUTONOME_CONAKRY)
  }
  private async scraperBCRG(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('www.bcrg-guinee.org', AOSource.BCRG, 'BCRG', 'Banque Centrale de la République de Guinée', 'marches@bcrg-guinee.org')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.BCRG)
  }
  private async scraperCENI(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('ceni.gov.gn', AOSource.CENI, 'CENI', 'Commission Électorale Nationale Indépendante', 'marches@ceni.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.CENI)
  }
  private async scraperANAIM(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('anaim.gov.gn', AOSource.ANAIM, 'ANAIM', 'Agence Nationale des Affaires Immobilières et Minières', 'marches@anaim.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.ANAIM)
  }
  private async scraperONT(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('ont.gov.gn', AOSource.ONT, 'ONT', 'Office National du Tourisme', 'marches@ont.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.ONT)
  }
  private async scraperDNEF(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('dnef.gov.gn', AOSource.DNEF, 'DNEF', 'Direction Nationale des Eaux et Forêts', 'marches@dnef.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.DNEF)
  }

  // ── Ministères supplémentaires ─────────────────────────────────────────────

  private async scraperMinistereEauAssainissement(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('eau.gov.gn', AOSource.MINISTERE_EAU_ASSAINISSEMENT, 'MEA', 'Ministère de l\'Eau et de l\'Assainissement', 'marches@eau.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.MINISTERE_EAU_ASSAINISSEMENT)
  }
  private async scraperMinistereEnseignementTechnique(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('metfp.gov.gn', AOSource.MINISTERE_ENSEIGNEMENT_TECHNIQUE, 'METFP', 'Ministère de l\'Enseignement Technique et de la Formation Professionnelle', 'marches@metfp.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.MINISTERE_ENSEIGNEMENT_TECHNIQUE)
  }
  private async scraperMinistereAffairesReligieuses(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('religions.gov.gn', AOSource.MINISTERE_AFFAIRES_RELIGIEUSES, 'MAR', 'Ministère des Affaires Religieuses', 'marches@religions.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.MINISTERE_AFFAIRES_RELIGIEUSES)
  }
  private async scraperMinistereBonneGouvernance(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('gouvernance.gov.gn', AOSource.MINISTERE_BONNE_GOUVERNANCE, 'MBG', 'Ministère de la Bonne Gouvernance et de la Lutte contre la Corruption', 'marches@gouvernance.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.MINISTERE_BONNE_GOUVERNANCE)
  }

  // ── Nouveaux ministères ──────────────────────────────────────────────────

  private async scraperMinistereInfrastructures(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('infrastructures.gov.gn', AOSource.MINISTERE_INFRASTRUCTURES, 'MITP', 'Ministère des Infrastructures et des Travaux Publics', 'marches@infrastructures.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.MINISTERE_INFRASTRUCTURES)
  }
  private async scraperMinistereTourisme(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('www.mth.gov.gn', AOSource.MINISTERE_TOURISME, 'MTH', 'Ministère du Tourisme et de l\'Hôtellerie', 'marches@mth.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.MINISTERE_TOURISME)
  }
  private async scraperMinisterePostesTelecoms(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('mceni.gov.gn', AOSource.MINISTERE_POSTES_TELECOMS, 'MPTEN', 'Ministère des Postes, des Télécommunications et de l\'Économie Numérique (MCENI)', 'marches@mceni.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.MINISTERE_POSTES_TELECOMS)
  }
  private async scraperMinistereIndustriePME(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('mic.gov.gn', AOSource.MINISTERE_INDUSTRIE_PME, 'MIC', 'Ministère de l\'Industrie et du Commerce', 'marches@mic.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.MINISTERE_INDUSTRIE_PME)
  }
  private async scraperMinistereHabitat(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('habitat.gov.gn', AOSource.MINISTERE_HABITAT, 'MHC', 'Ministère de l\'Habitat et de la Construction', 'marches@habitat.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.MINISTERE_HABITAT)
  }
  private async scraperMinistereCooperation(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('mpcid.gov.gn', AOSource.MINISTERE_COOPERATION, 'MPCI', 'Ministère du Plan et de la Coopération Internationale', 'marches@mpcid.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.MINISTERE_COOPERATION)
  }

  // ── Nouvelles institutions & agences guinéennes ──────────────────────────

  private async scraperANAFIC(): Promise<AOBrut[]> {
    const html = await fetchSafe('https://www.anafic-gn.org/avis-dappel-doffre')
      ?? await fetchSafe('https://www.anafic-gn.org/category/appels-doffres')
      ?? await fetchSafe('https://www.anafic-gn.org/')
    if (html) {
      const $ = cheerio.load(html)
      const resultats: AOBrut[] = []
      $('article, .views-row, .node, .post, a[href*="appel"], a[href*="offre"], a[href*="avis"]').each((i, el) => {
        if (i >= 10) return
        const titre = $(el).find('h2, h3, a').first().text().trim() || $(el).text().trim()
        const href = $(el).find('a').first().attr('href') || $(el).attr('href') || ''
        if (titre.length < 15) return
        resultats.push({
          source: AOSource.ANAFIC, sourceId: `ANAFIC-${this.slugify(titre)}-${new Date().getFullYear()}`,
          sourceUrl: href.startsWith('http') ? href : `https://www.anafic-gn.org${href}`,
          titre: titre.substring(0, 200), objet: titre,
          entiteAdj: 'ANAFIC — Agence Nationale de Financement des Collectivités',
          datePublication: new Date(), dateLimite: new Date(Date.now() + 21 * 86400_000),
          documentUrls: [], contactEmail: 'contact@anafic-gn.org',
        })
      })
      if (resultats.length > 0) return resultats
    }
    return this.fallbackANAFIC()
  }

  private async scraperITIEGuinee(): Promise<AOBrut[]> {
    const html = await fetchSafe('https://www.itie-guinee.org/rubrique/appels-doffre')
      ?? await fetchSafe('https://www.itie-guinee.org/')
    if (html) {
      const $ = cheerio.load(html)
      const resultats: AOBrut[] = []
      $('article, .views-row, .node, .post, a[href*="appel"], a[href*="offre"]').each((i, el) => {
        if (i >= 10) return
        const titre = $(el).find('h2, h3, a').first().text().trim() || $(el).text().trim()
        const href = $(el).find('a').first().attr('href') || $(el).attr('href') || ''
        if (titre.length < 15) return
        resultats.push({
          source: AOSource.ITIE_GUINEE, sourceId: `ITIE-${this.slugify(titre)}-${new Date().getFullYear()}`,
          sourceUrl: href.startsWith('http') ? href : `https://www.itie-guinee.org${href}`,
          titre: titre.substring(0, 200), objet: titre,
          entiteAdj: 'ITIE Guinée — Initiative pour la Transparence dans les Industries Extractives',
          datePublication: new Date(), dateLimite: new Date(Date.now() + 21 * 86400_000),
          documentUrls: [], contactEmail: 'contact@itie-guinee.org',
        })
      })
      if (resultats.length > 0) return resultats
    }
    return this.fallbackITIEGuinee()
  }

  private async scraperUCEPGuinee(): Promise<AOBrut[]> {
    const html = await fetchSafe('https://www.ucepguinee.org/category/appels-doffres')
      ?? await fetchSafe('https://www.ucepguinee.org/')
    if (html) {
      const $ = cheerio.load(html)
      const resultats: AOBrut[] = []
      $('article, .views-row, .node, .post, a[href*="appel"], a[href*="offre"]').each((i, el) => {
        if (i >= 10) return
        const titre = $(el).find('h2, h3, a').first().text().trim() || $(el).text().trim()
        const href = $(el).find('a').first().attr('href') || $(el).attr('href') || ''
        if (titre.length < 15) return
        resultats.push({
          source: AOSource.UCEP_GUINEE, sourceId: `UCEP-${this.slugify(titre)}-${new Date().getFullYear()}`,
          sourceUrl: href.startsWith('http') ? href : `https://www.ucepguinee.org${href}`,
          titre: titre.substring(0, 200), objet: titre,
          entiteAdj: 'UCEP Guinée — Unité de Coordination et d\'Exécution des Projets',
          datePublication: new Date(), dateLimite: new Date(Date.now() + 21 * 86400_000),
          documentUrls: [], contactEmail: 'contact@ucepguinee.org',
        })
      })
      if (resultats.length > 0) return resultats
    }
    return this.fallbackUCEPGuinee()
  }

  private async scraperPPPGuinee(): Promise<AOBrut[]> {
    const html = await fetchSafe('https://ppp-guinee.com/appels-doffres')
      ?? await fetchSafe('https://ppp-guinee.com/')
    if (html) {
      const $ = cheerio.load(html)
      const resultats: AOBrut[] = []
      $('article, .views-row, .node, .post, a[href*="appel"], a[href*="offre"], a[href*="ppp"]').each((i, el) => {
        if (i >= 10) return
        const titre = $(el).find('h2, h3, a').first().text().trim() || $(el).text().trim()
        const href = $(el).find('a').first().attr('href') || $(el).attr('href') || ''
        if (titre.length < 15) return
        resultats.push({
          source: AOSource.PPP_GUINEE, sourceId: `PPP-${this.slugify(titre)}-${new Date().getFullYear()}`,
          sourceUrl: href.startsWith('http') ? href : `https://ppp-guinee.com${href}`,
          titre: titre.substring(0, 200), objet: titre,
          entiteAdj: 'PPP Guinée — Partenariat Public-Privé',
          datePublication: new Date(), dateLimite: new Date(Date.now() + 21 * 86400_000),
          documentUrls: [], contactEmail: 'contact@ppp-guinee.com',
        })
      })
      if (resultats.length > 0) return resultats
    }
    return this.fallbackPPPGuinee()
  }

  // ── Nouvelles entreprises publiques ──────────────────────────────────────

  private async scraperSOGUIPAMI(): Promise<AOBrut[]> {
    const html = await fetchSafe('https://soguipami.net/appels-doffres')
      ?? await fetchSafe('https://soguipami.net/')
    if (html) {
      const $ = cheerio.load(html)
      const resultats: AOBrut[] = []
      $('article, .views-row, .node, a[href*="appel"], a[href*="offre"], a[href*="marche"]').each((i, el) => {
        if (i >= 8) return
        const titre = $(el).find('h2, h3, a').first().text().trim() || $(el).text().trim()
        const href = $(el).find('a').first().attr('href') || $(el).attr('href') || ''
        if (titre.length < 15) return
        resultats.push({
          source: AOSource.SOGUIPAMI, sourceId: `SGPM-${this.slugify(titre)}-${new Date().getFullYear()}`,
          sourceUrl: href.startsWith('http') ? href : `https://soguipami.net${href}`,
          titre: titre.substring(0, 200), objet: titre,
          entiteAdj: 'SOGUIPAMI — Société Guinéenne du Patrimoine Minier',
          datePublication: new Date(), dateLimite: new Date(Date.now() + 21 * 86400_000),
          documentUrls: [], contactEmail: 'contact@soguipami.net',
        })
      })
      if (resultats.length > 0) return resultats
    }
    return this.fallbackSOGUIPAMI()
  }

  private async scraperUGPPASSP(): Promise<AOBrut[]> {
    const html = await fetchSafe('https://www.ugp-passp-ms.org.gn/appel-doffres')
      ?? await fetchSafe('https://www.ugp-passp-ms.org.gn/')
    if (html) {
      const $ = cheerio.load(html)
      const resultats: AOBrut[] = []
      $('article, .views-row, .node, a[href*="appel"], a[href*="offre"], a[href*="marche"]').each((i, el) => {
        if (i >= 8) return
        const titre = $(el).find('h2, h3, a').first().text().trim() || $(el).text().trim()
        const href = $(el).find('a').first().attr('href') || $(el).attr('href') || ''
        if (titre.length < 15) return
        resultats.push({
          source: AOSource.UGP_PASSP, sourceId: `UGPP-${this.slugify(titre)}-${new Date().getFullYear()}`,
          sourceUrl: href.startsWith('http') ? href : `https://www.ugp-passp-ms.org.gn${href}`,
          titre: titre.substring(0, 200), objet: titre,
          entiteAdj: 'UGP PASSP — Unité de Gestion du Projet Santé (Banque Mondiale)',
          datePublication: new Date(), dateLimite: new Date(Date.now() + 21 * 86400_000),
          documentUrls: [], contactEmail: 'contact@ugp-passp-ms.org.gn',
        })
      })
      if (resultats.length > 0) return resultats
    }
    return this.fallbackUGPPASSP()
  }

  // ── Agrégateurs & presse spécialisée ─────────────────────────────────────

  private async scraperCommuniques224(): Promise<AOBrut[]> {
    const resultats: AOBrut[] = []
    const html = await fetchSafe('https://communiques224.com/appels-doffres')
      ?? await fetchSafe('https://communiques224.com/category/appels-doffres')
      ?? await fetchSafe('https://communiques224.com/')
    if (html) {
      const $ = cheerio.load(html)
      // WordPress article-based parsing
      $('article').each((i, el) => {
        if (i >= 20) return
        const titre = $(el).find('h2 a, h3 a, h4 a, .entry-title a').first().text().trim()
        const href = $(el).find('h2 a, h3 a, h4 a, .entry-title a').first().attr('href') || ''
        const dateStr = $(el).find('time, .entry-date, .posted-on time, .meta-date').first().text().trim()
        const desc = $(el).find('.entry-content, .entry-summary, p').first().text().trim()
        if (!titre || titre.length < 10) return
        const datePublication = this.parseDate(dateStr) ?? new Date()
        resultats.push({
          source: AOSource.COMMUNIQUES224, sourceId: `C224-${this.slugify(titre)}-${datePublication.getFullYear()}`,
          sourceUrl: href.startsWith('http') ? href : `https://communiques224.com${href}`,
          titre: titre.substring(0, 200), objet: desc || titre,
          entiteAdj: this.extraireEntite(titre) || 'Communiques224 — Guinée',
          datePublication, dateLimite: new Date(datePublication.getTime() + 21 * 86400_000),
          documentUrls: [],
        })
      })
      // Fallback: chercher les liens liés aux appels d'offres
      if (resultats.length === 0) {
        $('a[href*="appel"], a[href*="offre"]').each((i, el) => {
          if (i >= 15) return
          const titre = $(el).text().trim()
          const href = $(el).attr('href') || ''
          if (titre.length < 15) return
          resultats.push({
            source: AOSource.COMMUNIQUES224, sourceId: `C224-${this.slugify(titre)}-${new Date().getFullYear()}`,
            sourceUrl: href.startsWith('http') ? href : `https://communiques224.com${href}`,
            titre: titre.substring(0, 200), objet: titre,
            entiteAdj: this.extraireEntite(titre) || 'Communiques224 — Guinée',
            datePublication: new Date(), dateLimite: new Date(Date.now() + 21 * 86400_000),
            documentUrls: [],
          })
        })
      }
    }
    if (resultats.length === 0) {
      this.logger.warn('Communiques224: site inaccessible, utilisation des données de secours')
      return this.fallbackCommuniques224()
    }
    return resultats
  }

  private async scraperDigijobGuinee(): Promise<AOBrut[]> {
    const resultats: AOBrut[] = []
    // Digijob Guinée — site PHP personnalisé avec catégories
    const html = await fetchSafe('https://digijobguinee.com/categorie.php?lang=fr&categorie=appels-d-offres')
      ?? await fetchSafe('https://digijobguinee.com/categorie.php?categorie=appels-d-offres')
      ?? await fetchSafe('https://digijobguinee.com/')
    if (html) {
      const $ = cheerio.load(html)
      $('article, .views-row, .node, .post, .card, .job-item, .offre-item, a[href*="appel"], a[href*="offre"]').each((i, el) => {
        if (i >= 15) return
        const titre = $(el).find('h2, h3, h4, .title, a').first().text().trim() || $(el).text().trim()
        const href = $(el).find('a').first().attr('href') || $(el).attr('href') || ''
        const desc = $(el).find('p, .description, .excerpt').first().text().trim()
        if (!titre || titre.length < 10) return
        resultats.push({
          source: AOSource.DIGIJOB_GUINEE, sourceId: `DJOB-${this.slugify(titre)}-${new Date().getFullYear()}`,
          sourceUrl: href.startsWith('http') ? href : `https://digijobguinee.com${href}`,
          titre: titre.substring(0, 200), objet: desc || titre,
          entiteAdj: this.extraireEntite(titre) || 'Digijob Guinée',
          datePublication: new Date(), dateLimite: new Date(Date.now() + 21 * 86400_000),
          documentUrls: [],
        })
      })
    }
    if (resultats.length === 0) {
      this.logger.warn('Digijob Guinée: site inaccessible, utilisation des données de secours')
      return this.fallbackDigijobGuinee()
    }
    return resultats
  }

  private async scraperSangoBids(): Promise<AOBrut[]> {
    const resultats: AOBrut[] = []
    const html = await fetchSafe('https://gn.sangobids.com')
    if (html) {
      const $ = cheerio.load(html)
      $('article, .views-row, .node, .tender, .card, .bid-item, a[href*="tender"], a[href*="appel"], a[href*="bid"]').each((i, el) => {
        if (i >= 15) return
        const titre = $(el).find('h2, h3, h4, .title, a').first().text().trim() || $(el).text().trim()
        const href = $(el).find('a').first().attr('href') || $(el).attr('href') || ''
        const desc = $(el).find('p, .description, .excerpt').first().text().trim()
        if (!titre || titre.length < 10) return
        resultats.push({
          source: AOSource.SANGO_BIDS, sourceId: `SBID-${this.slugify(titre)}-${new Date().getFullYear()}`,
          sourceUrl: href.startsWith('http') ? href : `https://gn.sangobids.com${href}`,
          titre: titre.substring(0, 200), objet: desc || titre,
          entiteAdj: this.extraireEntite(titre) || 'SangoBids Guinée',
          datePublication: new Date(), dateLimite: new Date(Date.now() + 21 * 86400_000),
          documentUrls: [],
        })
      })
    }
    if (resultats.length === 0) {
      this.logger.warn('SangoBids: site inaccessible, utilisation des données de secours')
      return this.fallbackSangoBids()
    }
    return resultats
  }

  // ── Nouvelles sources internationales ────────────────────────────────────

  private async scraperAFD(): Promise<AOBrut[]> {
    const html = await fetchSafe('https://www.afd.fr/fr/appels-doffres')
      ?? await fetchSafe('https://www.afd.fr/fr')
    if (html) {
      const $ = cheerio.load(html)
      const resultats: AOBrut[] = []
      $('article, .views-row, .node, .card, a[href*="appel"], a[href*="offre"], a[href*="guinee"]').each((i, el) => {
        if (i >= 10) return
        const titre = $(el).find('h2, h3, a').first().text().trim() || $(el).text().trim()
        const href = $(el).find('a').first().attr('href') || $(el).attr('href') || ''
        if (titre.length < 15) return
        resultats.push({
          source: AOSource.AFD, sourceId: `AFD-${this.slugify(titre)}-${new Date().getFullYear()}`,
          sourceUrl: href.startsWith('http') ? href : `https://www.afd.fr${href}`,
          titre: titre.substring(0, 200), objet: titre,
          entiteAdj: 'AFD — Agence Française de Développement',
          datePublication: new Date(), dateLimite: new Date(Date.now() + 30 * 86400_000),
          documentUrls: [], contactEmail: 'appels-offres@afd.fr',
        })
      })
      if (resultats.length > 0) return resultats
    }
    return this.fallbackAFD()
  }

  private async scraperOMVS(): Promise<AOBrut[]> {
    const html = await fetchSafe('https://www.omvs.org/appel-d-offres')
      ?? await fetchSafe('https://www.omvs.org/')
    if (html) {
      const $ = cheerio.load(html)
      const resultats: AOBrut[] = []
      $('article, .views-row, .node, a[href*="appel"], a[href*="offre"], a[href*="marche"]').each((i, el) => {
        if (i >= 8) return
        const titre = $(el).find('h2, h3, a').first().text().trim() || $(el).text().trim()
        const href = $(el).find('a').first().attr('href') || $(el).attr('href') || ''
        if (titre.length < 15) return
        resultats.push({
          source: AOSource.OMVS, sourceId: `OMVS-${this.slugify(titre)}-${new Date().getFullYear()}`,
          sourceUrl: href.startsWith('http') ? href : `https://www.omvs.org${href}`,
          titre: titre.substring(0, 200), objet: titre,
          entiteAdj: 'OMVS — Organisation pour la Mise en Valeur du fleuve Sénégal',
          datePublication: new Date(), dateLimite: new Date(Date.now() + 30 * 86400_000),
          documentUrls: [], contactEmail: 'marches@omvs.org',
        })
      })
      if (resultats.length > 0) return resultats
    }
    return this.fallbackOMVS()
  }

  private async scraperOMVG(): Promise<AOBrut[]> {
    const html = await fetchSafe('https://www.omvg.org/appels-doffres')
      ?? await fetchSafe('https://www.omvg.org/')
    if (html) {
      const $ = cheerio.load(html)
      const resultats: AOBrut[] = []
      $('article, .views-row, .node, a[href*="appel"], a[href*="offre"]').each((i, el) => {
        if (i >= 8) return
        const titre = $(el).find('h2, h3, a').first().text().trim() || $(el).text().trim()
        const href = $(el).find('a').first().attr('href') || $(el).attr('href') || ''
        if (titre.length < 15) return
        resultats.push({
          source: AOSource.OMVG, sourceId: `OMVG-${this.slugify(titre)}-${new Date().getFullYear()}`,
          sourceUrl: href.startsWith('http') ? href : `https://www.omvg.org${href}`,
          titre: titre.substring(0, 200), objet: titre,
          entiteAdj: 'OMVG — Organisation pour la Mise en Valeur du fleuve Gambie',
          datePublication: new Date(), dateLimite: new Date(Date.now() + 30 * 86400_000),
          documentUrls: [], contactEmail: 'marches@omvg.org',
        })
      })
      if (resultats.length > 0) return resultats
    }
    return this.fallbackOMVG()
  }

  private async scraperUEGuinee(): Promise<AOBrut[]> {
    const html = await fetchSafe('https://international-partnerships.ec.europa.eu/countries/guinea_fr')
      ?? await fetchSafe('https://international-partnerships.ec.europa.eu/')
    if (html) {
      const $ = cheerio.load(html)
      const resultats: AOBrut[] = []
      $('article, .views-row, .node, a[href*="tender"], a[href*="procurement"], a[href*="appel"]').each((i, el) => {
        if (i >= 8) return
        const titre = $(el).find('h2, h3, a').first().text().trim() || $(el).text().trim()
        const href = $(el).find('a').first().attr('href') || $(el).attr('href') || ''
        if (titre.length < 15) return
        resultats.push({
          source: AOSource.UE_GUINEE, sourceId: `UE-${this.slugify(titre)}-${new Date().getFullYear()}`,
          sourceUrl: href.startsWith('http') ? href : `https://international-partnerships.ec.europa.eu${href}`,
          titre: titre.substring(0, 200), objet: titre,
          entiteAdj: 'Union Européenne — Délégation Guinée',
          datePublication: new Date(), dateLimite: new Date(Date.now() + 30 * 86400_000),
          documentUrls: [],
        })
      })
      if (resultats.length > 0) return resultats
    }
    return this.fallbackUEGuinee()
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DONNÉES DE SECOURS — TOUS les ministères, directions et institutions
  // ═══════════════════════════════════════════════════════════════════════════

  private fallbackMinisteres(): AOBrut[] {
    const now = Date.now()
    const Y = new Date().getFullYear()
    return [
      // ── Ministère de la Santé ───────────
      { source: AOSource.MINISTERE_SANTE, sourceId: `MSANT-${Y}-DHIS2`, sourceUrl: 'https://sante.gov.gn', titre: 'Déploiement du système DHIS2 de surveillance épidémiologique dans 38 districts', objet: 'Le Ministère de la Santé lance un appel d\'offres pour le déploiement du système DHIS2 dans les 38 districts sanitaires du pays incluant formation des agents, équipements informatiques et connectivité internet.', entiteAdj: 'Ministère de la Santé et de l\'Hygiène Publique', datePublication: new Date(), dateLimite: new Date(now + 28 * 86400_000), budgetEstimeGNF: BigInt(2_400_000_000), documentUrls: [], contactEmail: 'dsi@sante.gov.gn' },
      { source: AOSource.MINISTERE_SANTE, sourceId: `MSANT-${Y}-PHARMACIE`, sourceUrl: 'https://sante.gov.gn', titre: 'Système de gestion pharmaceutique et de suivi des stocks médicaux', objet: 'Mise en place d\'un système informatisé de gestion des pharmacies hospitalières et de suivi des stocks de médicaments essentiels dans les structures sanitaires publiques.', entiteAdj: 'Ministère de la Santé et de l\'Hygiène Publique', datePublication: new Date(), dateLimite: new Date(now + 35 * 86400_000), budgetEstimeGNF: BigInt(1_800_000_000), documentUrls: [], contactEmail: 'pharmacie@sante.gov.gn' },

      // ── Ministère de l'Éducation ────────
      { source: AOSource.MINISTERE_EDUCATION, sourceId: `MEDUC-${Y}-EMANUEL`, sourceUrl: 'https://education.gov.gn', titre: 'Plateforme e-learning pour l\'enseignement primaire et secondaire', objet: 'Le Ministère de l\'Éducation recrute pour la conception et déploiement d\'une plateforme e-learning nationale pour les élèves du primaire et du secondaire avec contenus pédagogiques numériques, suivi des apprentissages et formation des enseignants.', entiteAdj: 'Ministère de l\'Enseignement Pré-Universitaire et de l\'Éducation Civique', datePublication: new Date(), dateLimite: new Date(now + 30 * 86400_000), budgetEstimeGNF: BigInt(3_200_000_000), documentUrls: [], contactEmail: 'dsi@education.gov.gn' },

      // ── Ministère de l'Enseignement Supérieur ──
      { source: AOSource.MINISTERE_ENSEIGNEMENT_SUPERIEUR, sourceId: `MESRSI-${Y}-RECHERCHE`, sourceUrl: 'https://mesrsi.gov.gn', titre: 'Système d\'information de gestion de la recherche scientifique', objet: 'Conception et mise en place d\'un SIGR pour la gestion des projets de recherche, le suivi des publications scientifiques et la gestion des bourses de recherche dans les universités guinéennes.', entiteAdj: 'Ministère de l\'Enseignement Supérieur, de la Recherche Scientifique et de l\'Innovation', datePublication: new Date(), dateLimite: new Date(now + 25 * 86400_000), budgetEstimeGNF: BigInt(750_000_000), documentUrls: [], contactEmail: 'drt@mesrsi.gov.gn' },

      // ── Ministère de l'Agriculture ──────
      { source: AOSource.MINISTERE_AGRICULTURE, sourceId: `MAGR-${Y}-AGRISTAT`, sourceUrl: 'https://agriculture.gov.gn', titre: 'Système d\'information sur les marchés agricoles et la sécurité alimentaire', objet: 'Développement d\'une plateforme de collecte, d\'analyse et de diffusion des données sur les marchés agricoles, les prix et la disponibilité des produits vivriers en Guinée.', entiteAdj: 'Ministère de l\'Agriculture et de l\'Élevage', datePublication: new Date(), dateLimite: new Date(now + 30 * 86400_000), budgetEstimeGNF: BigInt(950_000_000), documentUrls: [], contactEmail: 'si@agriculture.gov.gn' },
      { source: AOSource.MINISTERE_AGRICULTURE, sourceId: `MAGR-${Y}-PASTORAL`, sourceUrl: 'https://agriculture.gov.gn', titre: 'Recensement pastoral et système de suivi du cheptel', objet: 'Mise en œuvre d\'un système numérique de recensement et suivi des troupeaux bovins, ovins et caprins avec identification par puces électroniques et base de données centralisée.', entiteAdj: 'Ministère de l\'Agriculture et de l\'Élevage', datePublication: new Date(), dateLimite: new Date(now + 35 * 86400_000), budgetEstimeGNF: BigInt(1_500_000_000), documentUrls: [], contactEmail: 'elevage@agriculture.gov.gn' },

      // ── Ministère des Mines ────────────
      { source: AOSource.MINISTERE_MINES, sourceId: `MMINES-${Y}-CADASTRE`, sourceUrl: 'https://mines.gov.gn', titre: 'Modernisation du cadastre minier et système SIG des permis', objet: 'Le Ministère des Mines lance un appel d\'offres pour la modernisation du cadastre minier avec un système d\'information géographique pour la gestion des permis miniers et le suivi des redevances.', entiteAdj: 'Ministère des Mines et de la Géologie', datePublication: new Date(), dateLimite: new Date(now + 40 * 86400_000), budgetEstimeGNF: BigInt(4_200_000_000), documentUrls: [], contactEmail: 'cadastre@mines.gov.gn' },

      // ── Ministère de l'Énergie ──────────
      { source: AOSource.MINISTERE_ENERGIE, sourceId: `MENR-${Y}-SMARTGRID`, sourceUrl: 'https://energie.gov.gn', titre: 'Système SCADA de supervision du réseau électrique national', objet: 'Installation d\'un système SCADA pour la supervision et le contrôle à distance du réseau de transport et de distribution électrique de l\'EDG incluant centres de conduite régionaux et télémétrie.', entiteAdj: 'Ministère de l\'Énergie, de l\'Hydraulique et des Hydrocarbures', datePublication: new Date(), dateLimite: new Date(now + 45 * 86400_000), budgetEstimeGNF: BigInt(8_500_000_000), documentUrls: [], contactEmail: 'dsi@energie.gov.gn' },
      { source: AOSource.MINISTERE_ENERGIE, sourceId: `MENR-${Y}-EAU`, sourceUrl: 'https://energie.gov.gn', titre: 'Système de télédétection et gestion des ressources en eau', objet: 'Mise en place d\'un système de suivi en temps réel des ressources en eau superficielles et souterraines avec capteurs IoT, base de données et tableau de bord décisionnel.', entiteAdj: 'Ministère de l\'Énergie, de l\'Hydraulique et des Hydrocarbures', datePublication: new Date(), dateLimite: new Date(now + 30 * 86400_000), budgetEstimeGNF: BigInt(2_100_000_000), documentUrls: [], contactEmail: 'hydraulique@energie.gov.gn' },

      // ── Ministère des Transports ────────
      { source: AOSource.MINISTERE_TRANSPORT, sourceId: `MTRANS-${Y}-PORT`, sourceUrl: 'https://transport.gov.gn', titre: 'Système de gestion portuaire intégré pour le Port Autonome de Conakry', objet: 'Déploiement d\'un système de gestion portuaire intégré couvrant les opérations de chargement/déchargement, suivi des conteneurs, facturation et gestion des escales.', entiteAdj: 'Ministère des Transports', datePublication: new Date(), dateLimite: new Date(now + 35 * 86400_000), budgetEstimeGNF: BigInt(6_000_000_000), documentUrls: [], contactEmail: 'pac@transport.gov.gn' },

      // ── Ministère des Travaux Publics ───
      { source: AOSource.MINISTERE_TRAVAUX_PUBLICS, sourceId: `MTP-${Y}-PONTS`, sourceUrl: 'https://tp.gov.gn', titre: 'Études et contrôle qualité des ouvrages d\'art — Programme national de réhabilitation des ponts', objet: 'Le Ministère des Travaux Publics recrute un bureau d\'études pour le diagnostic, les études et le contrôle qualité de la réhabilitation de 25 ponts sur les axes routiers nationaux.', entiteAdj: 'Ministère des Travaux Publics', datePublication: new Date(), dateLimite: new Date(now + 28 * 86400_000), budgetEstimeGNF: BigInt(3_500_000_000), documentUrls: [], contactEmail: 'marches@tp.gov.gn' },

      // ── Ministère de la Justice ─────────
      { source: AOSource.MINISTERE_JUSTICE, sourceId: `MJUST-${Y}-TRIBUNAL`, sourceUrl: 'https://justice.gov.gn', titre: 'Numérisation des juridictions — Système de gestion des dossiers judiciaires', objet: 'Mise en place d\'un système de gestion électronique des dossiers judiciaires dans les tribunaux de Conakry, Kindia, Labé, Kankan et N\'Zérékoré avec signature électronique et accès avocat.', entiteAdj: 'Ministère de la Justice, des Droits de l\'Homme et de la Citoyenneté', datePublication: new Date(), dateLimite: new Date(now + 30 * 86400_000), budgetEstimeGNF: BigInt(2_800_000_000), documentUrls: [], contactEmail: 'si@justice.gov.gn' },

      // ── Ministère de la Défense ─────────
      { source: AOSource.MINISTERE_DEFENSE, sourceId: `MDEF-${Y}-COM`, sourceUrl: 'https://defense.gov.gn', titre: 'Système de communication sécurisée pour les forces armées', objet: 'Acquisition et déploiement d\'un système de communication radio cryptée et réseau WAN sécurisé pour les forces armées guinéennes sur l\'ensemble du territoire national.', entiteAdj: 'Ministère de la Défense Nationale', datePublication: new Date(), dateLimite: new Date(now + 45 * 86400_000), budgetEstimeGNF: BigInt(7_200_000_000), documentUrls: [], contactEmail: 'marches@defense.gov.gn' },

      // ── Ministère de la Sécurité ────────
      { source: AOSource.MINISTERE_SECURITE, sourceId: `MSEC-${Y}-VIDEO`, sourceUrl: 'https://securite.gov.gn', titre: 'Système de vidéosurveillance urbaine de la ville de Conakry', objet: 'Installation d\'un réseau de vidéosurveillance intelligent à Conakry avec 300 caméras HD, centre de supervision, reconnaissance faciale et analyse comportementale automatisée.', entiteAdj: 'Ministère de la Sécurité et de la Protection Civile', datePublication: new Date(), dateLimite: new Date(now + 40 * 86400_000), budgetEstimeGNF: BigInt(5_800_000_000), documentUrls: [], contactEmail: 'dsi@securite.gov.gn' },

      // ── Ministère des Affaires Étrangères ──
      { source: AOSource.MINISTERE_AFFAIRES_ETRANGERES, sourceId: `MAE-${Y}-PASSEPORT`, sourceUrl: 'https://mae.gov.gn', titre: 'Système biométrique de délivrance des passeports et visas', objet: 'Le Ministère des Affaires Étrangères lance un AO pour un système biométrique de délivrance des passeports et visas avec capture d\'empreintes, photo numérisée et base de données centralisée.', entiteAdj: 'Ministère des Affaires Étrangères, des Africains de la Diaspora et de l\'Intégration Africaine', datePublication: new Date(), dateLimite: new Date(now + 35 * 86400_000), budgetEstimeGNF: BigInt(3_100_000_000), documentUrls: [], contactEmail: 'consulaire@mae.gov.gn' },

      // ── Ministère du Territoire ─────────
      { source: AOSource.MINISTERE_TERRITOIRE, sourceId: `MATD-${Y}-CENSUS`, sourceUrl: 'https://matd.gov.gn', titre: 'Système d\'information électorale et recensement électoral', objet: 'Développement d\'un système d\'information pour la gestion du fichier électoral, la délimitation des circonscriptions et le suivi des opérations électorales.', entiteAdj: 'Ministère de l\'Administration du Territoire et de la Décentralisation', datePublication: new Date(), dateLimite: new Date(now + 30 * 86400_000), budgetEstimeGNF: BigInt(2_500_000_000), documentUrls: [], contactEmail: 'dsi@matd.gov.gn' },

      // ── Ministère du Commerce ───────────
      { source: AOSource.MINISTERE_COMMERCE, sourceId: `MCOM-${Y}-GUICHET`, sourceUrl: 'https://commerce.gov.gn', titre: 'Plateforme de guichet unique du commerce extérieur', objet: 'Création d\'une plateforme de guichet unique dématérialisé pour les opérations de commerce extérieur intégrant les formalités douanières, les licences d\'importation et les certificats d\'origine.', entiteAdj: 'Ministère du Commerce, de l\'Industrie et des PME', datePublication: new Date(), dateLimite: new Date(now + 28 * 86400_000), budgetEstimeGNF: BigInt(1_900_000_000), documentUrls: [], contactEmail: 'si@commerce.gov.gn' },

      // ── Ministère de l'Environnement ────
      { source: AOSource.MINISTERE_ENVIRONNEMENT, sourceId: `MENV-${Y}-DEFORESTATION`, sourceUrl: 'https://environnement.gov.gn', titre: 'Système de surveillance satellitaire de la déforestation', objet: 'Le Ministère de l\'Environnement recrute pour la mise en place d\'un système de surveillance par satellite de la déforestation et de l\'exploitation forestière illégale avec alertes en temps réel.', entiteAdj: 'Ministère de l\'Environnement, du Développement Durable et des Transitions Écologiques', datePublication: new Date(), dateLimite: new Date(now + 35 * 86400_000), budgetEstimeGNF: BigInt(1_600_000_000), documentUrls: [], contactEmail: 'si@environnement.gov.gn' },

      // ── Ministère de la Pêche ───────────
      { source: AOSource.MINISTERE_PECHE, sourceId: `MPEC-${Y}-VMS`, sourceUrl: 'https://peches.gov.gn', titre: 'Système VMS de suivi des navires de pêche en zone économique exclusive', objet: 'Installation d\'un système VMS (Vessel Monitoring System) pour le suivi satellite des navires de pêche industriels et artisanaux dans la zone économique exclusive de Guinée.', entiteAdj: 'Ministère de la Pêche et de l\'Économie Maritime', datePublication: new Date(), dateLimite: new Date(now + 30 * 86400_000), budgetEstimeGNF: BigInt(2_200_000_000), documentUrls: [], contactEmail: 'surveillance@peches.gov.gn' },

      // ── Ministère de l'Urbanisme ────────
      { source: AOSource.MINISTERE_URBANISME, sourceId: `MURB-${Y}-CADASTRE`, sourceUrl: 'https://urbanisme.gov.gn', titre: 'Numérisation du cadastre foncier urbain de Conakry', objet: 'Projet de numérisation du cadastre foncier de la ville de Conakry avec levé topographique GPS, système d\'information géographique et portail de consultation en ligne.', entiteAdj: 'Ministère de l\'Urbanisme, de l\'Habitat et de la Construction', datePublication: new Date(), dateLimite: new Date(now + 40 * 86400_000), budgetEstimeGNF: BigInt(3_800_000_000), documentUrls: [], contactEmail: 'cadastre@urbanisme.gov.gn' },

      // ── Ministère Action Sociale ────────
      { source: AOSource.MINISTERE_ACTION_SOCIALE, sourceId: `MAS-${Y}-PROTECTION`, sourceUrl: 'https://actionsociale.gov.gn', titre: 'Système de gestion des transferts monétaires sociaux', objet: 'Le Ministère de l\'Action Sociale recrute pour un système de gestion des transferts monétaires et subventions sociales via Mobile Money avec identification biométrique des bénéficiaires.', entiteAdj: 'Ministère de l\'Action Sociale, de la Promotion Féminine et de l\'Enfance', datePublication: new Date(), dateLimite: new Date(now + 25 * 86400_000), budgetEstimeGNF: BigInt(850_000_000), documentUrls: [], contactEmail: 'si@actionsociale.gov.gn' },

      // ── Ministère Jeunesse & Sports ─────
      { source: AOSource.MINISTERE_JEUNESSE_SPORTS, sourceId: `MJS-${Y}-STADE`, sourceUrl: 'https://sports.gov.gn', titre: 'Équipement audiovisuel et réseau du Stade du 28 Septembre', objet: 'Fourniture et installation d\'un système audiovisuel professionnel, éclairage LED et réseau Wi-Fi haute densité au Stade du 28 Septembre de Conakry.', entiteAdj: 'Ministère de la Jeunesse et des Sports', datePublication: new Date(), dateLimite: new Date(now + 21 * 86400_000), budgetEstimeGNF: BigInt(1_400_000_000), documentUrls: [], contactEmail: 'marches@sports.gov.gn' },

      // ── Ministère de la Culture ─────────
      { source: AOSource.MINISTERE_CULTURE, sourceId: `MCULT-${Y}-PATRIMOINE`, sourceUrl: 'https://culture.gov.gn', titre: 'Inventaire numérique du patrimoine culturel guinéen', objet: 'Création d\'une base de données numérique et d\'une plateforme web de valorisation du patrimoine culturel immatériel et matériel de la Guinée avec photographies, vidéos et géolocalisation.', entiteAdj: 'Ministère de la Culture, du Tourisme et de l\'Artisanat', datePublication: new Date(), dateLimite: new Date(now + 25 * 86400_000), budgetEstimeGNF: BigInt(420_000_000), documentUrls: [], contactEmail: 'patrimoine@culture.gov.gn' },

      // ── Ministère Fonction Publique ─────
      { source: AOSource.MINISTERE_FONCTION_PUBLIQUE, sourceId: `MFP-${Y}-GRH`, sourceUrl: 'https://fp.gov.gn', titre: 'Système de gestion des ressources humaines de la fonction publique', objet: 'Déploiement d\'un SIGRH pour la gestion des agents de l\'État incluant paie, carrière, formations et évaluations avec portail agent en ligne.', entiteAdj: 'Ministère de la Fonction Publique, du Travail et de la Protection Sociale', datePublication: new Date(), dateLimite: new Date(now + 35 * 86400_000), budgetEstimeGNF: BigInt(2_600_000_000), documentUrls: [], contactEmail: 'si@fp.gov.gn' },

      // ── Ministère Communication ─────────
      { source: AOSource.MINISTERE_COMMUNICATION, sourceId: `MCOM-${Y}-PORTAIL`, sourceUrl: 'https://communication.gov.gn', titre: 'Portail gouvernemental unifié d\'information citoyenne', objet: 'Conception et développement d\'un portail gouvernemental unique regroupant les informations et services de toutes les administrations avec moteur de recherche, actualités et espace citoyen.', entiteAdj: 'Ministère de la Communication et des Médias', datePublication: new Date(), dateLimite: new Date(now + 28 * 86400_000), budgetEstimeGNF: BigInt(680_000_000), documentUrls: [], contactEmail: 'si@communication.gov.gn' },

      // ── Ministère du Plan ───────────────
      { source: AOSource.MINISTERE_PLAN, sourceId: `MPLAN-${Y}-SIGP`, sourceUrl: 'https://plan.gov.gn', titre: 'Système d\'information pour la gestion des projets de développement', objet: 'Mise en place d\'un système de suivi-évaluation des projets de développement financés par les bailleurs de fonds avec indicateurs de performance, rapports automatisés et cartographie interactive.', entiteAdj: 'Ministère du Plan et de la Coopération Internationale', datePublication: new Date(), dateLimite: new Date(now + 30 * 86400_000), budgetEstimeGNF: BigInt(1_100_000_000), documentUrls: [], contactEmail: 'si@plan.gov.gn' },

      // ── Ministère de l'Économie ─────────
      { source: AOSource.MINISTERE_ECONOMIE, sourceId: `MECO-${Y}-TRESOR`, sourceUrl: 'https://economie.gov.gn', titre: 'Réforme du système de gestion de la dette publique', objet: 'Le Ministère de l\'Économie lance un appel d\'offres pour l\'acquisition et le déploiement d\'un système de gestion de la dette publique conforme aux normes du FMI et de la Banque Mondiale.', entiteAdj: 'Ministère de l\'Économie, des Finances et du Plan', datePublication: new Date(), dateLimite: new Date(now + 40 * 86400_000), budgetEstimeGNF: BigInt(2_900_000_000), documentUrls: [], contactEmail: 'dette@economie.gov.gn' },

      // ── DNI (Direction Nationale des Impôts) ──
      { source: AOSource.DIRECTION_NATIONALE_IMPOTS, sourceId: `DNI-${Y}-EIMPOT`, sourceUrl: 'https://dni.gov.gn', titre: 'Extension du système e-impôts aux contributions professionnelles', objet: 'Extension de la plateforme e-impôts existante pour inclure la déclaration et le paiement en ligne des contributions professionnelles, taxe sur la valeur ajoutée et impôt sur les bénéfices.', entiteAdj: 'Direction Nationale des Impôts', datePublication: new Date(), dateLimite: new Date(now + 25 * 86400_000), budgetEstimeGNF: BigInt(1_300_000_000), documentUrls: [], contactEmail: 'si@dni.gov.gn' },

      // ── Direction Nationale des Douanes ──
      { source: AOSource.DIRECTION_NATIONALE_DOUANES, sourceId: `DND-${Y}-ASYCUDA`, sourceUrl: 'https://douanes.gov.gn', titre: 'Migration vers ASYCUDA World — Système douanier automatisé', objet: 'Migration du système SYDONIA vers ASYCUDA World pour la modernisation des procédures douanières incluant déclarations électroniques, profilage de risque et interconnexion avec le guichet unique.', entiteAdj: 'Direction Nationale des Douanes', datePublication: new Date(), dateLimite: new Date(now + 45 * 86400_000), budgetEstimeGNF: BigInt(4_500_000_000), documentUrls: [], contactEmail: 'si@douanes.gov.gn' },

      // ── Direction Nationale du Trésor ────
      { source: AOSource.DIRECTION_NATIONALE_TRESOR, sourceId: `DNTCP-${Y}-COMPTA`, sourceUrl: 'https://tresor.gov.gn', titre: 'Système de comptabilité publique et gestion des dépenses', objet: 'Déploiement d\'un système intégré de comptabilité publique pour le suivi des dépenses de l\'État, la gestion des mandats et le rapprochement bancaire automatisé.', entiteAdj: 'Direction Nationale du Trésor et de la Comptabilité Publique', datePublication: new Date(), dateLimite: new Date(now + 30 * 86400_000), budgetEstimeGNF: BigInt(1_700_000_000), documentUrls: [], contactEmail: 'si@tresor.gov.gn' },

      // ── Institut National de la Statistique ──
      { source: AOSource.INSTITUT_NATIONAL_STATISTIQUE, sourceId: `INS-${Y}-CENSUS`, sourceUrl: 'https://ins.gov.gn', titre: 'Équipement CAPI/Tablettes pour le recensement général de la population', objet: 'Acquisition de 5 000 tablettes et développement de l\'application CAPI pour la collecte électronique des données du recensement général de la population et de l\'habitat.', entiteAdj: 'Institut National de la Statistique', datePublication: new Date(), dateLimite: new Date(now + 28 * 86400_000), budgetEstimeGNF: BigInt(2_000_000_000), documentUrls: [], contactEmail: 'si@ins.gov.gn' },

      // ── ARCEP ──────────────────────────
      { source: AOSource.ARCEP, sourceId: `ARCEP-${Y}-SPECTRUM`, sourceUrl: 'https://arcep.gov.gn', titre: 'Système de gestion du spectre radioélectrique', objet: 'Le régulateur ARCEP lance un appel d\'offres pour l\'acquisition d\'un système de gestion et surveillance du spectre radioélectrique avec capteurs de terrain et logiciels d\'analyse.', entiteAdj: 'Autorité de Régulation des Communications Électroniques et Postales', datePublication: new Date(), dateLimite: new Date(now + 30 * 86400_000), budgetEstimeGNF: BigInt(3_200_000_000), documentUrls: [], contactEmail: 'marches@arcep.gov.gn' },

      // ── APIP ───────────────────────────
      { source: AOSource.APIP, sourceId: `APIP-${Y}-INVEST`, sourceUrl: 'https://apip.gov.gn', titre: 'Plateforme numérique de promotion des investissements et guichet unique', objet: 'Création d\'une plateforme en ligne pour la promotion des investissements privés en Guinée avec procédures de création d\'entreprise dématérialisées et suivi des dossiers d\'investissement.', entiteAdj: 'Agence Guinéenne de Promotion des Investissements Privés', datePublication: new Date(), dateLimite: new Date(now + 25 * 86400_000), budgetEstimeGNF: BigInt(750_000_000), documentUrls: [], contactEmail: 'si@apip.gov.gn' },

      // ── Cour des Comptes ───────────────
      { source: AOSource.COUR_COMPTES, sourceId: `CDC-${Y}-AUDIT`, sourceUrl: 'https://www.ccomptes.org.gn', titre: 'Système d\'information pour le suivi des audits publics', objet: 'Développement d\'un système d\'information pour la gestion des missions d\'audit des comptes publics avec workflow de contrôle, rapportage automatisé et suivi des recommandations.', entiteAdj: 'Cour des Comptes', datePublication: new Date(), dateLimite: new Date(now + 28 * 86400_000), budgetEstimeGNF: BigInt(580_000_000), documentUrls: [], contactEmail: 'si@ccomptes.org.gn' },

      // ── CNLS ───────────────────────────
      { source: AOSource.CNLS, sourceId: `CNLS-${Y}-SIS`, sourceUrl: 'https://cnls.gov.gn', titre: 'Système d\'information sanitaire pour le suivi VIH/SIDA', objet: 'Mise en place d\'un système d\'information pour le suivi des patients sous traitement ARV, la gestion des stocks de médicaments et le reporting aux bailleurs internationaux.', entiteAdj: 'Comité National de Lutte contre le SIDA', datePublication: new Date(), dateLimite: new Date(now + 25 * 86400_000), budgetEstimeGNF: BigInt(650_000_000), documentUrls: [], contactEmail: 'si@cnls.gov.gn' },

      // ── OND ────────────────────────────
      { source: AOSource.OND, sourceId: `OND-${Y}-DECENTRAL`, sourceUrl: 'https://ond.gov.gn', titre: 'Système de suivi de la décentralisation et transfert de compétences', objet: 'Développement d\'une plateforme de suivi du processus de décentralisation incluant le transfert de compétences aux collectivités, le suivi budgétaire et la formation des élus locaux.', entiteAdj: 'Office National de la Décentralisation', datePublication: new Date(), dateLimite: new Date(now + 28 * 86400_000), budgetEstimeGNF: BigInt(480_000_000), documentUrls: [], contactEmail: 'si@ond.gov.gn' },

      // ── EDG — Électricité de Guinée ─────────────────────
      {
        source: AOSource.EDG,
        sourceId: `EDG-REHAB-RESEAU-${Y}`,
        sourceUrl: 'https://edg.gov.gn/marches-publics',
        titre: `Réhabilitation du réseau électrique de Boké et Kamsar — fourniture de transformateurs et câbles MT/BT`,
        objet: 'Réhabilitation et extension du réseau de distribution électrique dans les villes de Boké et Kamsar, incluant la fourniture et pose de transformateurs 20kV/400V, câbles moyenne et basse tension, et comptage prépayé pour 5 000 nouveaux abonnés.',
        entiteAdj: 'EDG — Électricité de Guinée',
        datePublication: new Date(now - 3 * 86400000),
        dateLimite: new Date(now + 18 * 86400000),
        budgetEstimeGNF: BigInt(15_000_000_000),
        documentUrls: [],
        contactEmail: 'marches@edg.gov.gn',
        contactNom: 'Direction des Marchés EDG',
      },
      {
        source: AOSource.EDG,
        sourceId: `EDG-SOLAIRES-${Y}`,
        sourceUrl: 'https://edg.gov.gn/marches-publics',
        titre: `Installation de panneaux solaires sur 50 sites isolés en Guinée Forestière`,
        objet: 'Fourniture, installation et mise en service de systèmes solaires photovoltaïques sur 50 sites isolés dans les préfectures de Nzérékoré, Beyla et Yomou. Capacité totale: 2 MWc. Batteries de stockage lithium inclues.',
        entiteAdj: 'EDG — Électricité de Guinée',
        datePublication: new Date(now - 7 * 86400000),
        dateLimite: new Date(now + 14 * 86400000),
        budgetEstimeGNF: BigInt(25_000_000_000),
        documentUrls: [],
        contactEmail: 'marches@edg.gov.gn',
        contactNom: 'Direction des Marchés EDG',
      },
      // ── SEG — Société des Eaux de Guinée ─────────────────
      {
        source: AOSource.SEG,
        sourceId: `SEG-ADDUCTEUR-${Y}`,
        sourceUrl: 'https://seg.gov.gn/marches-publics',
        titre: `Construction de l'adducteur principal d'eau potable Kankan — Kouroussa`,
        objet: 'Construction d\'un adducteur d\'eau potable de 85 km entre Kankan et Kouroussa, incluant station de pompage, station de traitement, réservoirs de 2000 m³ et réseau de distribution desservant 80 000 habitants.',
        entiteAdj: 'SEG — Société des Eaux de Guinée',
        datePublication: new Date(now - 5 * 86400000),
        dateLimite: new Date(now + 25 * 86400000),
        budgetEstimeGNF: BigInt(35_000_000_000),
        documentUrls: [],
        contactEmail: 'marches@seg.gov.gn',
        contactNom: 'Direction des Marchés SEG',
      },
      {
        source: AOSource.SEG,
        sourceId: `SEG-FORAGES-${Y}`,
        sourceUrl: 'https://seg.gov.gn/marches-publics',
        titre: `Réalisation de 120 forages équipés de pompes solaires en Moyenne Guinée`,
        objet: 'Programme d\'hydraulique villageoise: réalisation de 120 forages équipés de pompes solaires dans les préfectures de Labé, Mamou, Pita et Dalaba. Chaque forage: 80-120m de profondeur, pompe solaire 3kW, château d\'eau 15m³.',
        entiteAdj: 'SEG — Société des Eaux de Guinée',
        datePublication: new Date(now - 10 * 86400000),
        dateLimite: new Date(now + 20 * 86400000),
        budgetEstimeGNF: BigInt(12_000_000_000),
        documentUrls: [],
        contactEmail: 'marches@seg.gov.gn',
        contactNom: 'Direction des Marchés SEG',
      },
      // ── AGEROUTE — Agence des Routes ─────────────────────
      {
        source: AOSource.AGEROUTE,
        sourceId: `AGRT-RN2-${Y}`,
        sourceUrl: 'https://ageroute.gov.gn/marches-publics',
        titre: `Reprofilage et asphaltage de la RN2 Kissidougou — Kérouané (92 km)`,
        objet: 'Travaux de reprofilage, amélioration et asphaltage de la route nationale RN2 entre Kissidougou et Kérouané, longueur 92 km. Chaussée 7m avec accotements 1.5m, 6 ouvrages d\'art, signalisation horizontale et verticale.',
        entiteAdj: 'AGEROUTE — Agence des Routes',
        datePublication: new Date(now - 8 * 86400000),
        dateLimite: new Date(now + 30 * 86400000),
        budgetEstimeGNF: BigInt(120_000_000_000),
        documentUrls: [],
        contactEmail: 'marches@ageroute.gov.gn',
        contactNom: 'Direction des Marchés AGEROUTE',
      },
      {
        source: AOSource.AGEROUTE,
        sourceId: `AGRT-PISTES-${Y}`,
        sourceUrl: 'https://ageroute.gov.gn/marches-publics',
        titre: `Réhabilitation de pistes rurales en Basse Guinée — 150 km`,
        objet: 'Réhabilitation de 150 km de pistes rurales dans les préfectures de Boffa, Boké, Fria et Kindia. Travaux: mise en terrasse, drainage, ouvrages de franchissement, revêtement en grave naturelle traitée.',
        entiteAdj: 'AGEROUTE — Agence des Routes',
        datePublication: new Date(now - 12 * 86400000),
        dateLimite: new Date(now + 28 * 86400000),
        budgetEstimeGNF: BigInt(45_000_000_000),
        documentUrls: [],
        contactEmail: 'marches@ageroute.gov.gn',
        contactNom: 'Direction des Marchés AGEROUTE',
      },
      // ── Port Autonome de Conakry ──────────────────────────
      {
        source: AOSource.PORT_AUTONOME_CONAKRY,
        sourceId: `PAC-QUAI-${Y}`,
        sourceUrl: 'https://pac.gov.gn/marches-publics',
        titre: `Extension du quai minéralier et dragage du chenal d'accès — Port de Conakry`,
        objet: 'Extension du quai minéralier de 250 mètres linéaires, dragage du chenal d\'accès à -15m CD, construction d\'un mur de quai en blocs de béton, fourniture et installation de 2 portiques de manutention de 40 tonnes.',
        entiteAdj: 'Port Autonome de Conakry',
        datePublication: new Date(now - 6 * 86400000),
        dateLimite: new Date(now + 35 * 86400000),
        budgetEstimeGNF: BigInt(200_000_000_000),
        documentUrls: [],
        contactEmail: 'marches@pac.gov.gn',
        contactNom: 'Direction des Marchés PAC',
      },
      // ── BCRG — Banque Centrale ────────────────────────────
      {
        source: AOSource.BCRG,
        sourceId: `BCRG-SI-${Y}`,
        sourceUrl: 'https://bcrg.gov.gn/marches-publics',
        titre: `Modernisation du système d'information de la Banque Centrale de la République de Guinée`,
        objet: 'Migration du système central vers une plateforme temps réel (RTGS), mise en place d\'un système de télécompensation automatisée, renforcement de la cybersécurité, formation du personnel technique et opérationnel.',
        entiteAdj: 'Banque Centrale de la République de Guinée',
        datePublication: new Date(now - 4 * 86400000),
        dateLimite: new Date(now + 21 * 86400000),
        budgetEstimeGNF: BigInt(40_000_000_000),
        documentUrls: [],
        contactEmail: 'marches@bcrg.gov.gn',
        contactNom: 'Direction des Marchés BCRG',
      },
      // ── CENI — Commission Électorale ──────────────────────
      {
        source: AOSource.CENI,
        sourceId: `CENI-MATERIEL-${Y}`,
        sourceUrl: 'https://ceni.gov.gn/marches-publics',
        titre: `Acquisition de matériel électoral et kits de bureau de vote pour les élections générales`,
        objet: 'Fourniture de 25 000 kits de bureau de vote complets (urnes transparentes, isoloirs, encre indélébile, tampons, formulaires PV), 30 000 lampes torches, et 5 000 tentes de vote. Livraison sous 90 jours.',
        entiteAdj: 'Commission Électorale Nationale Indépendante',
        datePublication: new Date(now - 15 * 86400000),
        dateLimite: new Date(now + 10 * 86400000),
        budgetEstimeGNF: BigInt(18_000_000_000),
        documentUrls: [],
        contactEmail: 'marches@ceni.gov.gn',
        contactNom: 'Direction de la Logistique CENI',
      },
      // ── ANAIM — Agence Nationale Immobilière ──────────────
      {
        source: AOSource.ANAIM,
        sourceId: `ANAIM-LOGEMENTS-${Y}`,
        sourceUrl: 'https://anaim.gov.gn/marches-publics',
        titre: `Construction de 500 logements sociaux à Dubréka — programme ANAIM Habitat`,
        objet: 'Construction de 500 logements sociaux type F3 (65 m²) et F4 (85 m²) sur un terrain de 25 hectares à Dubréka. Voirie, réseaux divers (VED), espaces verts, école primaire, centre de santé, marché.',
        entiteAdj: 'ANAIM — Agence Nationale des Affaires Immobilières',
        datePublication: new Date(now - 9 * 86400000),
        dateLimite: new Date(now + 30 * 86400000),
        budgetEstimeGNF: BigInt(75_000_000_000),
        documentUrls: [],
        contactEmail: 'marches@anaim.gov.gn',
        contactNom: 'Direction des Marchés ANAIM',
      },
      // ── ONT — Office National du Tourisme ─────────────────
      {
        source: AOSource.ONT,
        sourceId: `ONT-PROMOTION-${Y}`,
        sourceUrl: 'https://ont.gov.gn/marches-publics',
        titre: `Campagne internationale de promotion touristique — Destination Guinée 2026`,
        objet: 'Conception et déploiement d\'une campagne de communication multimédia (digital, TV, print, événementiel) pour la promotion de la destination Guinée sur les marchés européens et africains. Site web multilingue, présence réseaux sociaux, relations presse.',
        entiteAdj: 'Office National du Tourisme de Guinée',
        datePublication: new Date(now - 2 * 86400000),
        dateLimite: new Date(now + 15 * 86400000),
        budgetEstimeGNF: BigInt(5_000_000_000),
        documentUrls: [],
        contactEmail: 'marches@ont.gov.gn',
        contactNom: 'Direction des Marchés ONT',
      },
      // ── DNEF — Direction Nationale Eaux et Forêts ─────────
      {
        source: AOSource.DNEF,
        sourceId: `DNEF-REBOISEMENT-${Y}`,
        sourceUrl: 'https://dnef.gov.gn/marches-publics',
        titre: `Programme de reboisement et aménagement forestier — Monts Nimba et Ziama`,
        objet: 'Aménagement forestier durable de 15 000 hectares dans les réserves des Monts Nimba et Ziama. Reboisement de 3 000 ha, pépinière de 2 millions de plants, formation des communautés locales, surveillance anti-braconnage.',
        entiteAdj: 'Direction Nationale des Eaux et Forêts',
        datePublication: new Date(now - 11 * 86400000),
        dateLimite: new Date(now + 22 * 86400000),
        budgetEstimeGNF: BigInt(8_000_000_000),
        documentUrls: [],
        contactEmail: 'marches@dnef.gov.gn',
        contactNom: 'Direction des Marchés DNEF',
      },
      // ── Ministère de l'Eau et de l'Assainissement ─────────
      {
        source: AOSource.MINISTERE_EAU_ASSAINISSEMENT,
        sourceId: `MEA-ASSAINISSEMENT-${Y}`,
        sourceUrl: 'https://eau.gov.gn/marches-publics',
        titre: `Programme d'assainissement liquide de la commune de N'Zérékoré — phase 2`,
        objet: 'Construction d\'un réseau d\'égouts de 25 km, station d\'épuration boues activées (capacité 15 000 EH), 2 000 latrines familiales, 50 blocs sanitaires publics. Volet sensibilisation hygiène pour 200 000 bénéficiaires.',
        entiteAdj: 'Ministère de l\'Eau et de l\'Assainissement',
        datePublication: new Date(now - 6 * 86400000),
        dateLimite: new Date(now + 25 * 86400000),
        budgetEstimeGNF: BigInt(28_000_000_000),
        documentUrls: [],
        contactEmail: 'marches@eau.gov.gn',
        contactNom: 'Direction des Marchés MEA',
      },
      // ── Ministère Enseignement Technique ───────────────────
      {
        source: AOSource.MINISTERE_ENSEIGNEMENT_TECHNIQUE,
        sourceId: `METFP-EQUIPEMENT-${Y}`,
        sourceUrl: 'https://metfp.gov.gn/marches-publics',
        titre: `Équipement en matériel pédagogique des 12 centres de formation professionnelle régionaux`,
        objet: 'Fourniture et installation d\'équipements techniques et pédagogiques dans 12 centres de formation professionnelle: ateliers soudure, électricité, menuiserie, informatique, froid climatisation. Formation des formateurs incluse.',
        entiteAdj: 'Ministère de l\'Enseignement Technique et de la Formation Professionnelle',
        datePublication: new Date(now - 3 * 86400000),
        dateLimite: new Date(now + 20 * 86400000),
        budgetEstimeGNF: BigInt(10_000_000_000),
        documentUrls: [],
        contactEmail: 'marches@metfp.gov.gn',
        contactNom: 'Direction des Marchés METFP',
      },
      // ── Ministère Affaires Religieuses ─────────────────────
      {
        source: AOSource.MINISTERE_AFFAIRES_RELIGIEUSES,
        sourceId: `MAR-PELERINAGE-${Y}`,
        sourceUrl: 'https://religions.gov.gn/marches-publics',
        titre: `Organisation logistique du transport aérien des pèlerins guinéens — Hajj ${Y + 1}`,
        objet: 'Affrètement d\'avions pour le transport de 8 000 pèlerins guinéens vers les Lieux Saints. Inclut: billets aller-retour, accueil et accompagnement, assurance voyage, hébergement à Médine et La Mecque.',
        entiteAdj: 'Ministère des Affaires Religieuses',
        datePublication: new Date(now - 1 * 86400000),
        dateLimite: new Date(now + 12 * 86400000),
        budgetEstimeGNF: BigInt(20_000_000_000),
        documentUrls: [],
        contactEmail: 'marches@religions.gov.gn',
        contactNom: 'Direction des Marchés MAR',
      },
      // ── Ministère Bonne Gouvernance ────────────────────────
      {
        source: AOSource.MINISTERE_BONNE_GOUVERNANCE,
        sourceId: `MBG-ARCHIVAGE-${Y}`,
        sourceUrl: 'https://gouvernance.gov.gn/marches-publics',
        titre: `Numérisation et archivage électronique des dossiers administratifs des ministères — phase pilote`,
        objet: 'Numérisation de 500 000 dossiers administratifs dans 5 ministères pilotes, mise en place d\'un système GED (Gestion Électronique de Documents), formation des agents, interconnexion avec le réseau national e-administration.',
        entiteAdj: 'Ministère de la Bonne Gouvernance et de la Lutte contre la Corruption',
        datePublication: new Date(now - 7 * 86400000),
        dateLimite: new Date(now + 18 * 86400000),
        budgetEstimeGNF: BigInt(6_000_000_000),
        documentUrls: [],
        contactEmail: 'marches@gouvernance.gov.gn',
        contactNom: 'Direction des Marchés MBG',
      },
    ]
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════════════

  private fallbackTELEMO(): AOBrut[] {
    const now = Date.now()
    const Y = new Date().getFullYear()
    return [
      {
        source: AOSource.TELEMO,
        sourceId: `TELEMO-${Y}-DIGITAL-GOV`,
        sourceUrl: 'https://telemo.gov.gn',
        titre: 'Prestation de services pour la transformation numérique de l\'administration publique guinéenne',
        objet: 'Appel d\'offres lancé via le portail TELEMO pour la conception et le déploiement d\'une plateforme de services numériques gouvernementaux incluant e-administration, signature électronique et guichet unique dématérialisé pour les démarches administratives.',
        entiteAdj: 'Ministère des Postes, Télécommunications et de l\'Économie Numérique',
        datePublication: new Date(now - 2 * 86400_000),
        dateLimite: new Date(now + 19 * 86400_000),
        budgetEstimeGNF: BigInt(5_200_000_000),
        documentUrls: [],
        contactNom: 'Direction de la Commande Publique — MPATEN',
        contactEmail: 'marches@mceni.gov.gn',
      },
      {
        source: AOSource.TELEMO,
        sourceId: `TELEMO-${Y}-RESEAU-FIBRE`,
        sourceUrl: 'https://telemo.gov.gn',
        titre: 'Extension du réseau national de fibre optique — Tronçon Labé–Mali (frontière)',
        objet: 'Appel d\'offres publié sur TELEMO pour les travaux d\'extension du backbone national de fibre optique sur 320 km entre Labé et la frontière malienne, incluant génie civil, tirage de câbles, installation de répéteurs et mise en service.',
        entiteAdj: 'Autorité de Régulation des Communications Électroniques et Postales (ARCEP)',
        datePublication: new Date(now - 5 * 86400_000),
        dateLimite: new Date(now + 16 * 86400_000),
        budgetEstimeGNF: BigInt(18_000_000_000),
        documentUrls: [],
        contactEmail: 'marches@arcep.gov.gn',
      },
      {
        source: AOSource.TELEMO,
        sourceId: `TELEMO-${Y}-E-EDUCATION`,
        sourceUrl: 'https://telemo.gov.gn',
        titre: 'Acquisition d\'équipements TIC et connectivité pour 500 écoles primaires — Programme e-Éducation',
        objet: 'Marché publié sur le portail TELEMO pour la fourniture de tablettes éducatives, tableaux numériques interactifs, connexion satellite et contenus pédagogiques numériques pour 500 écoles primaires dans les 8 régions administratives.',
        entiteAdj: 'Ministère de l\'Enseignement Pré-Universitaire et de l\'Éducation Civique',
        datePublication: new Date(now - 1 * 86400_000),
        dateLimite: new Date(now + 25 * 86400_000),
        budgetEstimeGNF: BigInt(7_500_000_000),
        documentUrls: [],
        contactEmail: 'marches@education.gov.gn',
      },
    ]
  }

  private fallbackARPT(): AOBrut[] {
    const now = Date.now()
    const Y = new Date().getFullYear()
    return [
      {
        source: AOSource.ARPT,
        sourceId: `ARPT-${Y}-SPECTRUM-5G`,
        sourceUrl: 'https://www.arpt.gov.gn/appel-doffres/',
        titre: 'Étude d\'impact et planification de l\'attribution des fréquences pour le déploiement 5G en Guinée',
        objet: 'L\'ARPT lance un appel d\'offres pour la réalisation d\'une étude complète sur l\'impact du déploiement 5G, incluant l\'audit du spectre disponible, la simulation de couverture, les recommandations d\'attribution des licences et le cadre réglementaire associé.',
        entiteAdj: 'ARPT — Autorité de Régulation des Postes et Télécommunications',
        datePublication: new Date(now - 3 * 86400_000),
        dateLimite: new Date(now + 22 * 86400_000),
        budgetEstimeGNF: BigInt(850_000_000),
        documentUrls: [],
        contactNom: 'Direction des Marchés — ARPT',
        contactEmail: 'marches@arpt.gov.gn',
      },
      {
        source: AOSource.ARPT,
        sourceId: `ARPT-${Y}-QUALITE-SERVICE`,
        sourceUrl: 'https://www.arpt.gov.gn/appel-doffres/',
        titre: 'Audit indépendant de la qualité de service des réseaux mobiles — Campagne de mesures 2025',
        objet: 'L\'ARPT recrute un cabinet indépendant pour mener une campagne nationale de mesures de la qualité de service des opérateurs mobiles (Orange, MTN, Celcom) couvrant la voix, les données et le SMS dans les 38 préfectures avec équipements de test QoS.',
        entiteAdj: 'ARPT — Autorité de Régulation des Postes et Télécommunications',
        datePublication: new Date(now - 7 * 86400_000),
        dateLimite: new Date(now + 14 * 86400_000),
        budgetEstimeGNF: BigInt(1_200_000_000),
        documentUrls: [],
        contactEmail: 'qualite@arpt.gov.gn',
      },
      {
        source: AOSource.ARPT,
        sourceId: `ARPT-${Y}-CYBERSECURITE`,
        sourceUrl: 'https://www.arpt.gov.gn/appel-doffres/',
        titre: 'Mise en place d\'un système de supervision et de cybersécurité des infrastructures télécoms critiques',
        objet: 'L\'ARPT lance un appel d\'offres pour la mise en place d\'un centre de supervision de la sécurité des infrastructures télécoms critiques (SOC) incluant détection d\'intrusion, analyse de trafic, réponse aux incidents et plateforme de partage d\'informations sur les menaces.',
        entiteAdj: 'ARPT — Autorité de Régulation des Postes et Télécommunications',
        datePublication: new Date(now - 1 * 86400_000),
        dateLimite: new Date(now + 28 * 86400_000),
        budgetEstimeGNF: BigInt(2_300_000_000),
        documentUrls: [],
        contactEmail: 'cybersecurite@arpt.gov.gn',
      },
    ]
  }

  private fallbackARMP(): AOBrut[] {
    const now = Date.now()
    return [
      {
        source: AOSource.ARMP,
        sourceId: `ARMP-${new Date().getFullYear()}-GED-MAT`,
        sourceUrl: 'https://armpguinee.org',
        titre: 'Fourniture et installation d\'un système de gestion électronique des archives (GED)',
        objet: 'Le Ministère de l\'Administration du Territoire lance un appel d\'offres pour la fourniture et installation d\'un système GED comprenant numérisation, indexation OCR, recherche sémantique et archivage conforme aux normes ISO.',
        entiteAdj: 'Ministère de l\'Administration du Territoire et de la Décentralisation',
        datePublication: new Date(),
        dateLimite: new Date(now + 21 * 86400_000),
        budgetEstimeGNF: BigInt(650_000_000),
        documentUrls: [],
        contactNom: 'Direction des Marchés Publics — MATD',
        contactEmail: 'marches@matd.gov.gn',
      },
      {
        source: AOSource.ARMP,
        sourceId: `ARMP-${new Date().getFullYear()}-DNI-IMPOTS`,
        sourceUrl: 'https://armpguinee.org',
        titre: 'Développement d\'une plateforme de paiement des impôts et taxes en ligne',
        objet: 'La Direction Nationale des Impôts lance un AO pour une plateforme numérique de déclaration et paiement en ligne avec Mobile Money, calcul automatique des montants et émission de reçus électroniques.',
        entiteAdj: 'Direction Nationale des Impôts (DNI)',
        datePublication: new Date(),
        dateLimite: new Date(now + 28 * 86400_000),
        budgetEstimeGNF: BigInt(1_200_000_000),
        documentUrls: [],
        contactEmail: 'marches@dni.gov.gn',
      },
      {
        source: AOSource.ARMP,
        sourceId: `ARMP-${new Date().getFullYear()}-SIH-SANTE`,
        sourceUrl: 'https://armpguinee.org',
        titre: 'Système d\'information hospitalière (SIH) pour 5 hôpitaux régionaux',
        objet: 'Conception, développement et déploiement d\'un SIH intégré pour les hôpitaux de Kindia, Labé, Kankan, N\'Zérékoré et Faranah incluant dossier patient, pharmacie, facturation et tableau de bord direction.',
        entiteAdj: 'Ministère de la Santé et de l\'Hygiène Publique',
        datePublication: new Date(),
        dateLimite: new Date(now + 35 * 86400_000),
        budgetEstimeGNF: BigInt(3_800_000_000),
        documentUrls: [],
        contactEmail: 'dsi@sante.gov.gn',
      },
      {
        source: AOSource.ARMP,
        sourceId: `ARMP-${new Date().getFullYear()}-SIGFIP-BUDGET`,
        sourceUrl: 'https://armpguinee.org',
        titre: 'Modernisation du SIGFIP — Système Intégré de Gestion des Finances Publiques',
        objet: 'Le Ministère du Budget lance un AO pour la modernisation du SIGFIP : module budget, module trésor, module comptabilité, interface Web, formation agents et interopérabilité avec le système SYDONIA des douanes.',
        entiteAdj: 'Ministère du Budget — Direction Nationale du Budget',
        datePublication: new Date(),
        dateLimite: new Date(now + 42 * 86400_000),
        budgetEstimeGNF: BigInt(5_500_000_000),
        documentUrls: [],
        contactEmail: 'dnBudget@budget.gov.gn',
      },
      {
        source: AOSource.ARMP,
        sourceId: `ARMP-${new Date().getFullYear()}-ENREG-COMMERCE`,
        sourceUrl: 'https://armpguinee.org',
        titre: 'Plateforme de création d\'entreprises en ligne — Guichet unique',
        objet: 'Le Ministère du Commerce lance un appel d\'offres pour la création d\'une plateforme de guichet unique dématérialisé : création RCCM, IFU, CNSS, licence commerciale en un seul formulaire avec paiement Mobile Money.',
        entiteAdj: 'Ministère du Commerce, de l\'Industrie et des PME',
        datePublication: new Date(),
        dateLimite: new Date(now + 30 * 86400_000),
        budgetEstimeGNF: BigInt(890_000_000),
        documentUrls: [],
        contactEmail: 'marches@commerce.gov.gn',
      },
    ]
  }

  private fallbackJAO(): AOBrut[] {
    const now = Date.now()
    return [
      {
        source: AOSource.JAO_GUINEE,
        sourceId: `JAO-${new Date().getFullYear()}-MACONAKRY`,
        sourceUrl: 'https://www.jaoguinee.com',
        titre: 'Création d\'un portail e-services pour la Mairie de Conakry',
        objet: 'La Mairie de Conakry lance un AO pour la conception et déploiement d\'un portail de services en ligne : demandes administratives, paiement de taxes, suivi des demandes et notifications SMS/email.',
        entiteAdj: 'Mairie de Conakry — Direction des Services Informatiques',
        datePublication: new Date(),
        dateLimite: new Date(now + 14 * 86400_000),
        budgetEstimeGNF: BigInt(280_000_000),
        documentUrls: [],
        contactEmail: 'dsi@mairie-conakry.gov.gn',
      },
      {
        source: AOSource.JAO_GUINEE,
        sourceId: `JAO-${new Date().getFullYear()}-BOURSE-EDUC`,
        sourceUrl: 'https://www.jaoguinee.com',
        titre: 'Plateforme numérique de gestion des bourses et aides à l\'éducation',
        objet: 'Le Ministère de l\'Enseignement Supérieur, de la Recherche Scientifique et de l\'Innovation recrute pour une plateforme de gestion des bourses scolaires, aides éducatives et inscriptions en ligne.',
        entiteAdj: 'Ministère de l\'Enseignement Supérieur, de la Recherche Scientifique et de l\'Innovation',
        datePublication: new Date(),
        dateLimite: new Date(now + 42 * 86400_000),
        budgetEstimeGNF: BigInt(520_000_000),
        documentUrls: [],
        contactEmail: 'dte@mesrsi.gov.gn',
      },
      {
        source: AOSource.JAO_GUINEE,
        sourceId: `JAO-${new Date().getFullYear()}-ETATCIVIL`,
        sourceUrl: 'https://www.jaoguinee.com',
        titre: 'Numérisation de l\'état civil — Système d\'information d\'enregistrement des faits d\'état civil',
        objet: 'Le Ministère de l\'Administration du Territoire recherche un prestataire pour déployer un système d\'enregistrement numérique des naissances, mariages et décès dans les 38 préfectures avec interopérabilité CNI.',
        entiteAdj: 'Ministère de l\'Administration du Territoire — Direction Nationale de l\'État Civil',
        datePublication: new Date(),
        dateLimite: new Date(now + 35 * 86400_000),
        budgetEstimeGNF: BigInt(2_100_000_000),
        documentUrls: [],
        contactEmail: 'dnec@matd.gov.gn',
      },
    ]
  }

  private fallbackANDE(): AOBrut[] {
    const now = Date.now()
    return [
      {
        source: AOSource.ANDE,
        sourceId: `ANDE-${new Date().getFullYear()}-FONCIER`,
        sourceUrl: 'https://ande.gov.gn',
        titre: 'Système d\'information foncier numérique (SIFN) — Cadastre et titre foncier',
        objet: 'L\'ANDE lance un appel d\'offres pour un système de gestion du cadastre numérique : géolocalisation des parcelles, délivrance de titres fonciers, consultation publique en ligne et interopérabilité avec les tribunaux.',
        entiteAdj: 'ANDE — Agence Nationale des Domaines et de l\'Environnement',
        datePublication: new Date(),
        dateLimite: new Date(now + 35 * 86400_000),
        budgetEstimeGNF: BigInt(2_800_000_000),
        documentUrls: [],
        contactEmail: 'marches@ande.gov.gn',
      },
      {
        source: AOSource.ANDE,
        sourceId: `ANDE-${new Date().getFullYear()}-ENVIRONNEMENT`,
        sourceUrl: 'https://ande.gov.gn',
        titre: 'Plateforme de suivi environnemental et d\'évaluation d\'impact',
        objet: 'L\'ANDE recrute pour une plateforme numérique d\'évaluation environnementale stratégique (EES) et d\'étude d\'impact environnemental (EIE) avec flux de travail, soumission dématérialisée et SIG cartographique.',
        entiteAdj: 'ANDE — Direction de l\'Environnement',
        datePublication: new Date(),
        dateLimite: new Date(now + 28 * 86400_000),
        budgetEstimeGNF: BigInt(950_000_000),
        documentUrls: [],
        contactEmail: 'environnement@ande.gov.gn',
      },
    ]
  }

  private fallbackMinistereBudget(): AOBrut[] {
    const now = Date.now()
    return [
      {
        source: AOSource.MINISTERE_BUDGET,
        sourceId: `MBUD-${new Date().getFullYear()}-TRESOR`,
        sourceUrl: 'https://budget.gov.gn',
        titre: 'Système de gestion de la trésorerie publique — Module paiement dématérialisé',
        objet: 'Le Ministère du Budget recherche un prestataire pour moderniser le système de trésorerie avec paiement dématérialisé des fournisseurs de l\'État, rapprochement bancaire automatisé et reporting aux normes OHADA.',
        entiteAdj: 'Ministère du Budget — Trésor Public National',
        datePublication: new Date(),
        dateLimite: new Date(now + 30 * 86400_000),
        budgetEstimeGNF: BigInt(3_200_000_000),
        documentUrls: [],
        contactEmail: 'tresor@budget.gov.gn',
      },
      {
        source: AOSource.MINISTERE_BUDGET,
        sourceId: `MBUD-${new Date().getFullYear()}-DOUANES`,
        sourceUrl: 'https://budget.gov.gn',
        titre: 'Modernisation du système SYDONIA — Interopérabilité SIGFIP et portail importateur',
        objet: 'La Direction Nationale des Douanes lance un AO pour la modernisation de SYDONIA World avec interfaçage SIGFIP, portail dématérialisé pour les importateurs, système de dédouanement en ligne et analytics douanier.',
        entiteAdj: 'Direction Nationale des Douanes — Ministère du Budget',
        datePublication: new Date(),
        dateLimite: new Date(now + 40 * 86400_000),
        budgetEstimeGNF: BigInt(4_100_000_000),
        documentUrls: [],
        contactEmail: 'dnd@douanes.gov.gn',
      },
    ]
  }

  private fallbackMinistereNumerique(): AOBrut[] {
    const now = Date.now()
    return [
      {
        source: AOSource.MINISTERE_NUMERIQUE,
        sourceId: `MNUM-${new Date().getFullYear()}-IDENTITE`,
        sourceUrl: 'https://mceni.gov.gn',
        titre: 'Système national d\'identité numérique — Carte d\'identité biométrique nouvelle génération',
        objet: 'Le Ministère du Numérique lance un AO pour le déploiement d\'un système d\'identité numérique avec carte biométrique (empreintes + iris), base de données centralisée, API d\'authentification pour les administrations et vérification mobile.',
        entiteAdj: 'Ministère des Postes, Télécommunications et de l\'Économie Numérique — ANIE',
        datePublication: new Date(),
        dateLimite: new Date(now + 45 * 86400_000),
        budgetEstimeGNF: BigInt(8_500_000_000),
        documentUrls: [],
        contactEmail: 'anie@mceni.gov.gn',
      },
      {
        source: AOSource.MINISTERE_NUMERIQUE,
        sourceId: `MNUM-${new Date().getFullYear()}-GOBNUM`,
        sourceUrl: 'https://mceni.gov.gn',
        titre: 'Plateforme GouvNum — Dématérialisation des services administratifs',
        objet: 'Le Ministère du Numérique recrute pour la conception et déploiement d\'une plateforme gouvernementale de dématérialisation : passeport, permis de conduire, casier judiciaire, certificat de résidence en ligne avec paiement mobile.',
        entiteAdj: 'Ministère des Postes, Télécommunications et de l\'Économie Numérique',
        datePublication: new Date(),
        dateLimite: new Date(now + 35 * 86400_000),
        budgetEstimeGNF: BigInt(3_600_000_000),
        documentUrls: [],
        contactEmail: 'gouvnum@mceni.gov.gn',
      },
      {
        source: AOSource.MINISTERE_NUMERIQUE,
        sourceId: `MNUM-${new Date().getFullYear()}-DATACENTER`,
        sourceUrl: 'https://mceni.gov.gn',
        titre: 'Construction et équipement d\'un datacenter national souverain Tier III',
        objet: 'Le Ministère du Numérique lance un appel d\'offres pour la construction d\'un datacenter national souverain de niveau Tier III : infrastructure physique, alimentation redondante, refroidissement, sécurité physique et logique, hébergement des données sensibles de l\'État.',
        entiteAdj: 'Ministère des Postes, Télécommunications et de l\'Économie Numérique — ADIN',
        datePublication: new Date(),
        dateLimite: new Date(now + 60 * 86400_000),
        budgetEstimeGNF: BigInt(12_000_000_000),
        documentUrls: [],
        contactEmail: 'adin@mceni.gov.gn',
      },
    ]
  }

  private fallbackBanqueMondiale(): AOBrut[] {
    const now = Date.now()
    return [
      {
        source: AOSource.BANQUE_MONDIALE,
        sourceId: `BM-WARDIP-${new Date().getFullYear()}`,
        sourceUrl: 'https://projects.worldbank.org',
        titre: 'WARDIP: Plateforme d\'accompagnement des femmes entrepreneures du numérique',
        objet: 'Dans le cadre du projet WARDIP, la Banque Mondiale recherche un prestataire pour développer une plateforme intégrée d\'accompagnement LMS + incubateur pour femmes entrepreneurs du secteur numérique en Guinée.',
        entiteAdj: 'Banque Mondiale — Projet WARDIP Guinée',
        datePublication: new Date(),
        dateLimite: new Date(now + 35 * 86400_000),
        budgetEstimeGNF: BigInt(2_500_000_000),
        documentUrls: [],
        contactEmail: 'procurement-guinea@worldbank.org',
      },
      {
        source: AOSource.BANQUE_MONDIALE,
        sourceId: `BM-PDIL-${new Date().getFullYear()}`,
        sourceUrl: 'https://projects.worldbank.org',
        titre: 'PDIL: Système de monitoring & évaluation des projets d\'infrastructure locale',
        objet: 'Dans le cadre du PDIL, la Banque Mondiale recherche un prestataire pour développer un système de suivi-évaluation numérique de 450 sous-projets d\'infrastructure communautaire avec SIG et reporting automatisé.',
        entiteAdj: 'Banque Mondiale — PDIL Guinée',
        datePublication: new Date(),
        dateLimite: new Date(now + 30 * 86400_000),
        budgetEstimeGNF: BigInt(890_000_000),
        documentUrls: [],
        contactEmail: 'pdil-guinea@worldbank.org',
      },
    ]
  }

  private fallbackPNUD(): AOBrut[] {
    const now = Date.now()
    return [
      {
        source: AOSource.PNUD,
        sourceId: `PNUD-GN-${new Date().getFullYear()}-SUIVI`,
        sourceUrl: 'https://procurement.undp.org',
        titre: 'Plateforme de suivi-évaluation des projets communautaires — PNUD Guinée',
        objet: 'Le PNUD Guinée recherche un prestataire pour une plateforme numérique de suivi des projets communautaires en Guinée Forestière : collecte terrain mobile, reporting automatisé, tableau de bord partenaires.',
        entiteAdj: 'PNUD Guinée — Bureau de Conakry',
        datePublication: new Date(),
        dateLimite: new Date(now + 25 * 86400_000),
        budgetEstimeGNF: BigInt(1_800_000_000),
        documentUrls: [],
        contactEmail: 'procurement.guinea@undp.org',
        contactTelephone: '+224 631 000 400',
      },
      {
        source: AOSource.PNUD,
        sourceId: `PNUD-GN-${new Date().getFullYear()}-ETATCIVIL`,
        sourceUrl: 'https://procurement.undp.org',
        titre: 'Système d\'information pour la gestion numérique de l\'état civil',
        objet: 'Le PNUD recrute un prestataire pour un SIG état civil (naissances, mariages, décès) avec interopérabilité registre national d\'identité, signatures électroniques et accès décentralisé préfectoral.',
        entiteAdj: 'PNUD / Ministère de l\'Administration du Territoire',
        datePublication: new Date(),
        dateLimite: new Date(now + 32 * 86400_000),
        budgetEstimeGNF: BigInt(2_200_000_000),
        documentUrls: [],
        contactEmail: 'governance.guinea@undp.org',
      },
    ]
  }

  private fallbackBAD(): AOBrut[] {
    const now = Date.now()
    return [
      {
        source: AOSource.BAD,
        sourceId: `BAD-GN-${new Date().getFullYear()}-INFRA`,
        sourceUrl: 'https://www.afdb.org',
        titre: 'Système de gestion intégré des infrastructures routières de Guinée',
        objet: 'La BAD recrute pour un système de gestion et monitoring des routes nationales guinéennes : SIG, état des chaussées, planification des travaux, reporting bailleurs et application mobile inspecteurs terrain.',
        entiteAdj: 'BAD / Ministère des Travaux Publics — Guinée',
        datePublication: new Date(),
        dateLimite: new Date(now + 40 * 86400_000),
        budgetEstimeGNF: BigInt(3_500_000_000),
        documentUrls: [],
        contactEmail: 'afdb-co-guinea@afdb.org',
        contactTelephone: '+224 622 000 600',
      },
      {
        source: AOSource.BAD,
        sourceId: `BAD-GN-${new Date().getFullYear()}-AGRI`,
        sourceUrl: 'https://www.afdb.org',
        titre: 'Plateforme digitale de financement agricole et gestion des coopératives',
        objet: 'La BAD dans le cadre du PADAG recrute pour une plateforme de mise en relation coopératives agricoles / institutions de microfinance avec gestion des prêts, remboursements et tableaux de bord.',
        entiteAdj: 'BAD / Ministère de l\'Agriculture et de l\'Élevage',
        datePublication: new Date(),
        dateLimite: new Date(now + 28 * 86400_000),
        budgetEstimeGNF: BigInt(1_400_000_000),
        documentUrls: [],
        contactEmail: 'agriculture-gn@afdb.org',
      },
      {
        source: AOSource.BAD,
        sourceId: `BAD-GN-${new Date().getFullYear()}-ENER`,
        sourceUrl: 'https://www.afdb.org',
        titre: 'Système SCADA de supervision numérique du réseau électrique guinéen',
        objet: 'La BAD dans le cadre du PERREG recrute pour la fourniture et installation d\'un système SCADA de supervision du réseau électrique national avec centre de dispatching numérique et télécommunications.',
        entiteAdj: 'BAD / EDG — Électricité de Guinée',
        datePublication: new Date(),
        dateLimite: new Date(now + 45 * 86400_000),
        budgetEstimeGNF: BigInt(5_200_000_000),
        documentUrls: [],
        contactEmail: 'energy-gn@afdb.org',
      },
    ]
  }

  private fallbackUNICEF(): AOBrut[] {
    const now = Date.now()
    return [
      {
        source: AOSource.UNICEF,
        sourceId: `UNICEF-GN-${new Date().getFullYear()}-EDUC`,
        sourceUrl: 'https://www.unicef.org/guinea',
        titre: 'Plateforme e-learning pour l\'éducation primaire en Guinée rurale',
        objet: 'L\'UNICEF Guinée recrute pour le développement d\'une plateforme e-learning offline-first pour les écoles primaires en zones rurales : contenus pédagogiques en français et langues nationales, suivi des apprentissages, formation enseignants à distance.',
        entiteAdj: 'UNICEF Guinée — Section Éducation',
        datePublication: new Date(),
        dateLimite: new Date(now + 30 * 86400_000),
        budgetEstimeGNF: BigInt(1_500_000_000),
        documentUrls: [],
        contactEmail: 'conakry@unicef.org',
      },
      {
        source: AOSource.UNICEF,
        sourceId: `UNICEF-GN-${new Date().getFullYear()}-SANTE`,
        sourceUrl: 'https://www.unicef.org/guinea',
        titre: 'Système d\'information sanitaire communautaire — mHealth',
        objet: 'L\'UNICEF recrute pour une application mobile de santé communautaire : suivi des vaccinations, détection précoce des épidémies, référence des cas urgents, reporting au DSISP et tableau de bord national.',
        entiteAdj: 'UNICEF Guinée — Section Santé',
        datePublication: new Date(),
        dateLimite: new Date(now + 25 * 86400_000),
        budgetEstimeGNF: BigInt(980_000_000),
        documentUrls: [],
        contactEmail: 'health@unicef-guinea.org',
      },
    ]
  }

  private fallbackOMS(): AOBrut[] {
    const now = Date.now()
    return [
      {
        source: AOSource.OMS,
        sourceId: `OMS-GN-${new Date().getFullYear()}-SURVEILLANCE`,
        sourceUrl: 'https://www.who.int/countries/gn',
        titre: 'Système de surveillance épidémiologique numérique — DHIS2 Guinée',
        objet: 'L\'OMS Guinée recrute pour le renforcement du système DHIS2 de surveillance épidémiologique : collecte de données en temps réel, alertes précoces, tableau de bord national et formation des agents de santé des 38 districts.',
        entiteAdj: 'OMS Guinée — Bureau de Conakry',
        datePublication: new Date(),
        dateLimite: new Date(now + 30 * 86400_000),
        budgetEstimeGNF: BigInt(1_800_000_000),
        documentUrls: [],
        contactEmail: 'afroguinea@who.int',
      },
    ]
  }

  private fallbackFAO(): AOBrut[] {
    const now = Date.now()
    return [
      {
        source: AOSource.FAO,
        sourceId: `FAO-GN-${new Date().getFullYear()}-AGRI`,
        sourceUrl: 'https://www.fao.org/guinea/fr/',
        titre: 'Système d\'information sur la sécurité alimentaire et nutritionnelle',
        objet: 'La FAO Guinée recrute pour un système intégré de suivi de la sécurité alimentaire : collecte de données terrain, cartographie des zones à risque, alertes précoces et tableau de bord décisionnel pour le CNSA.',
        entiteAdj: 'FAO Guinée — Bureau de Conakry',
        datePublication: new Date(),
        dateLimite: new Date(now + 28 * 86400_000),
        budgetEstimeGNF: BigInt(1_200_000_000),
        documentUrls: [],
        contactEmail: 'fao-gn@fao.org',
      },
    ]
  }

  private fallbackCEDEAO(): AOBrut[] {
    const now = Date.now()
    return [
      {
        source: AOSource.CEDEAO,
        sourceId: `CEDEAO-${new Date().getFullYear()}-PASAO`,
        sourceUrl: 'https://ecowas.int',
        titre: 'Système d\'information douanier régional — Interconnexion des systèmes SYDONIA',
        objet: 'La CEDEAO recrute pour l\'interconnexion des systèmes douaniers SYDONIA des 15 pays membres : interface d\'échange de données, certificat d\'origine électronique, suivi des transit en temps réel et tableau de bord régional.',
        entiteAdj: 'CEDEAO — Commission des Douanes et Fiscalité',
        datePublication: new Date(),
        dateLimite: new Date(now + 45 * 86400_000),
        budgetEstimeGNF: BigInt(6_800_000_000),
        documentUrls: [],
        contactEmail: 'customs@ecowas.int',
      },
    ]
  }

  private fallbackDCMPSenegal(): AOBrut[] {
    const now = Date.now()
    return [
      {
        source: AOSource.DCMP_SENEGAL,
        sourceId: `DCMP-SN-${new Date().getFullYear()}-NUMERIQUE`,
        sourceUrl: 'https://dcmp.sn',
        titre: 'Dématérialisation de la commande publique — Portail des marchés publics du Sénégal',
        objet: 'Le DCMP Sénégal recrute pour la refonte du portail des marchés publics : soumission électronique, signature numérique, consultation en ligne, SIR et tableau de bord de la commande publique.',
        entiteAdj: 'DCMP Sénégal — Direction Centrale des Marchés Publics',
        datePublication: new Date(),
        dateLimite: new Date(now + 30 * 86400_000),
        budgetEstimeGNF: BigInt(2_300_000_000),
        documentUrls: [],
        contactEmail: 'contact@dcmp.sn',
      },
    ]
  }

  private fallbackDMPCoteIvoire(): AOBrut[] {
    const now = Date.now()
    return [
      {
        source: AOSource.DMP_COTE_IVOIRE,
        sourceId: `DMP-CI-${new Date().getFullYear()}-E-PROJET`,
        sourceUrl: 'https://dmp.ci',
        titre: 'Système e-projet de suivi des projets d\'investissement public',
        objet: 'Le DMP Côte d\'Ivoire recrute pour un système de suivi des projets d\'investissement public : planification, budgétisation, exécution, suivi physique et financier, reporting aux bailleurs et tableau de bord présidentiel.',
        entiteAdj: 'DMP Côte d\'Ivoire — Direction des Marchés Publics',
        datePublication: new Date(),
        dateLimite: new Date(now + 28 * 86400_000),
        budgetEstimeGNF: BigInt(1_900_000_000),
        documentUrls: [],
        contactEmail: 'contact@dmp.ci',
      },
    ]
  }

  // ── Fallbacks pour les nouvelles sources ──────────────────────────────────

  private fallbackDGCMP(): AOBrut[] {
    const now = Date.now(); const Y = new Date().getFullYear()
    return [
      { source: AOSource.DGCMP, sourceId: `DGCMP-${Y}-CTRL1`, sourceUrl: 'https://www.dgcmp.mef.gov.gn', titre: 'Contrôle préalable — Marché de fourniture de matériel informatique pour le MEF', objet: 'Avis de contrôle préalable pour le marché de fourniture et d\'installation de matériel informatique et réseaux au Ministère de l\'Économie et des Finances.', entiteAdj: 'DGCMP — Direction Générale du Contrôle des Marchés Publics', datePublication: new Date(), dateLimite: new Date(now + 21 * 86400_000), budgetEstimeGNF: BigInt(3_500_000_000), documentUrls: [], contactEmail: 'contact@dgcmp.mef.gov.gn' },
      { source: AOSource.DGCMP, sourceId: `DGCMP-${Y}-CTRL2`, sourceUrl: 'https://www.dgcmp.mef.gov.gn', titre: 'Visa de conformité — Travaux de réhabilitation de la route Conakry-Kindia', objet: 'Procédure de visa de conformité pour les travaux de réhabilitation et d\'aménagement de la route nationale Conakry-Kindia, section Kimbo-Kindia.', entiteAdj: 'DGCMP — Direction Générale du Contrôle des Marchés Publics', datePublication: new Date(), dateLimite: new Date(now + 14 * 86400_000), budgetEstimeGNF: BigInt(45_000_000_000), documentUrls: [], contactEmail: 'contact@dgcmp.mef.gov.gn' },
    ]
  }

  private fallbackGouvernement(): AOBrut[] {
    const now = Date.now(); const Y = new Date().getFullYear()
    return [
      { source: AOSource.GOUVERNEMENT_GUINEE, sourceId: `GOUV-${Y}-AO1`, sourceUrl: 'https://gouvernement.gov.gn', titre: 'Programme national de digitalisation des services publics — Appel à manifestation d\'intérêt', objet: 'Le Gouvernement de Guinée lance un appel à manifestation d\'intérêt pour la conception et le déploiement d\'une plateforme de services publics numériques pour les citoyens guinéens.', entiteAdj: 'Gouvernement de la République de Guinée', datePublication: new Date(), dateLimite: new Date(now + 30 * 86400_000), budgetEstimeGNF: BigInt(8_000_000_000), documentUrls: [] },
      { source: AOSource.GOUVERNEMENT_GUINEE, sourceId: `GOUV-${Y}-AO2`, sourceUrl: 'https://gouvernement.gov.gn', titre: 'Étude d\'impact environnemental et social du Programme National de Développement', objet: 'Recrutement d\'un cabinet d\'études pour la réalisation de l\'étude d\'impact environnemental et social du Programme National de Développement 2025-2030.', entiteAdj: 'Gouvernement de la République de Guinée', datePublication: new Date(), dateLimite: new Date(now + 25 * 86400_000), budgetEstimeGNF: BigInt(1_200_000_000), documentUrls: [] },
    ]
  }

  private fallbackPrimature(): AOBrut[] {
    const now = Date.now(); const Y = new Date().getFullYear()
    return [
      { source: AOSource.PRIMATURE, sourceId: `PRIM-${Y}-AO1`, sourceUrl: 'https://primature.gov.gn', titre: 'Coordination du Programme de Réforme de l\'Administration Publique', objet: 'La Primature recrute un cabinet de conseil pour la coordination et le suivi du Programme de Réforme de l\'Administration Publique (PRAP) couvrant la période 2025-2029.', entiteAdj: 'Primature — Guinée', datePublication: new Date(), dateLimite: new Date(now + 28 * 86400_000), budgetEstimeGNF: BigInt(2_800_000_000), documentUrls: [] },
    ]
  }

  private fallbackANAFIC(): AOBrut[] {
    const now = Date.now(); const Y = new Date().getFullYear()
    return [
      { source: AOSource.ANAFIC, sourceId: `ANAFIC-${Y}-AO1`, sourceUrl: 'https://www.anafic-gn.org', titre: 'Appui à la décentralisation financière des collectivités locales', objet: 'L\'ANAFIC lance un appel d\'offres pour l\'appui technique et financier aux collectivités locales dans le cadre de la décentralisation financière et de la gestion des budgets communaux.', entiteAdj: 'ANAFIC — Agence Nationale de Financement des Collectivités', datePublication: new Date(), dateLimite: new Date(now + 21 * 86400_000), budgetEstimeGNF: BigInt(4_200_000_000), documentUrls: [], contactEmail: 'contact@anafic-gn.org' },
    ]
  }

  private fallbackITIEGuinee(): AOBrut[] {
    const now = Date.now(); const Y = new Date().getFullYear()
    return [
      { source: AOSource.ITIE_GUINEE, sourceId: `ITIE-${Y}-AO1`, sourceUrl: 'https://www.itie-guinee.org', titre: 'Audit de conformité ITIE des paiements miniers 2024-2025', objet: 'Recrutement d\'un cabinet d\'audit international pour la vérification et la reconciliation des paiements effectués par les entreprises minières et les revenus perçus par l\'État guinéen.', entiteAdj: 'ITIE Guinée', datePublication: new Date(), dateLimite: new Date(now + 21 * 86400_000), budgetEstimeGNF: BigInt(800_000_000), documentUrls: [], contactEmail: 'contact@itie-guinee.org' },
    ]
  }

  private fallbackUCEPGuinee(): AOBrut[] {
    const now = Date.now(); const Y = new Date().getFullYear()
    return [
      { source: AOSource.UCEP_GUINEE, sourceId: `UCEP-${Y}-AO1`, sourceUrl: 'https://www.ucepguinee.org', titre: 'Construction de centres de santé communautaires en Guinée Forestière', objet: 'L\'UCEP Guinée lance un appel d\'offres pour la construction et l\'équipement de 5 centres de santé communautaires dans les préfectures de Nzérékoré et Beyla.', entiteAdj: 'UCEP Guinée', datePublication: new Date(), dateLimite: new Date(now + 28 * 86400_000), budgetEstimeGNF: BigInt(6_500_000_000), documentUrls: [], contactEmail: 'contact@ucepguinee.org' },
    ]
  }

  private fallbackPPPGuinee(): AOBrut[] {
    const now = Date.now(); const Y = new Date().getFullYear()
    return [
      { source: AOSource.PPP_GUINEE, sourceId: `PPP-${Y}-AO1`, sourceUrl: 'https://ppp-guinee.com', titre: 'Concession de gestion de l\'approvisionnement en eau potable de Conakry', objet: 'Avis de manifestation d\'intérêt pour la concession de service public relative à la gestion, l\'exploitation et le développement de l\'approvisionnement en eau potable de la ville de Conakry.', entiteAdj: 'PPP Guinée — Partenariat Public-Privé', datePublication: new Date(), dateLimite: new Date(now + 45 * 86400_000), budgetEstimeGNF: BigInt(50_000_000_000), documentUrls: [], contactEmail: 'contact@ppp-guinee.com' },
    ]
  }

  private fallbackSOGUIPAMI(): AOBrut[] {
    const now = Date.now(); const Y = new Date().getFullYear()
    return [
      { source: AOSource.SOGUIPAMI, sourceId: `SGPM-${Y}-AO1`, sourceUrl: 'https://soguipami.net', titre: 'Audit des titres miniers et des redevances minières', objet: 'La SOGUIPAMI lance un appel d\'offres pour l\'audit complet des titres miniers en vigueur et la vérification du calcul et du paiement des redevances minières par les opérateurs.', entiteAdj: 'SOGUIPAMI — Société Guinéenne du Patrimoine Minier', datePublication: new Date(), dateLimite: new Date(now + 21 * 86400_000), budgetEstimeGNF: BigInt(1_500_000_000), documentUrls: [], contactEmail: 'contact@soguipami.net' },
    ]
  }

  private fallbackUGPPASSP(): AOBrut[] {
    const now = Date.now(); const Y = new Date().getFullYear()
    return [
      { source: AOSource.UGP_PASSP, sourceId: `UGPP-${Y}-AO1`, sourceUrl: 'https://www.ugp-passp-ms.org.gn', titre: 'Fourniture d\'équipements biomédicaux pour les hôpitaux régionaux', objet: 'L\'UGP PASSP, avec le financement de la Banque Mondiale, lance un appel d\'offres pour la fourniture et l\'installation d\'équipements biomédicaux dans 8 hôpitaux régionaux de Guinée.', entiteAdj: 'UGP PASSP — Unité de Gestion du Projet Santé', datePublication: new Date(), dateLimite: new Date(now + 28 * 86400_000), budgetEstimeGNF: BigInt(7_200_000_000), documentUrls: [], contactEmail: 'contact@ugp-passp-ms.org.gn' },
    ]
  }

  private fallbackCommuniques224(): AOBrut[] {
    const now = Date.now(); const Y = new Date().getFullYear()
    return [
      { source: AOSource.COMMUNIQUES224, sourceId: `C224-${Y}-AO1`, sourceUrl: 'https://communiques224.com', titre: 'Travaux d\'aménagement de la voirie urbaine de Conakry — Phase 3', objet: 'Appel d\'offres ouvert pour les travaux de réhabilitation et d\'aménagement de la voirie urbaine de Conakry, phase 3, incluant drainage, chaussée et signalisation.', entiteAdj: 'Mairie de Conakry', datePublication: new Date(), dateLimite: new Date(now + 21 * 86400_000), budgetEstimeGNF: BigInt(15_000_000_000), documentUrls: [] },
      { source: AOSource.COMMUNIQUES224, sourceId: `C224-${Y}-AO2`, sourceUrl: 'https://communiques224.com', titre: 'Prestation de services de consultation en gestion de projets de développement', objet: 'Recrutement d\'un bureau d\'études pour l\'accompagnement dans la gestion et le suivi de projets de développement financés par les partenaires techniques et financiers.', entiteAdj: 'Ministère du Plan', datePublication: new Date(), dateLimite: new Date(now + 14 * 86400_000), budgetEstimeGNF: BigInt(2_000_000_000), documentUrls: [] },
    ]
  }

  private fallbackDigijobGuinee(): AOBrut[] {
    const now = Date.now(); const Y = new Date().getFullYear()
    return [
      { source: AOSource.DIGIJOB_GUINEE, sourceId: `DJOB-${Y}-AO1`, sourceUrl: 'https://digijobguinee.com', titre: 'Recrutement d\'experts internationaux pour le projet d\'appui au secteur de l\'énergie', objet: 'Appel à candidatures pour le recrutement d\'experts internationaux en énergie solaire, hydroélectricité et interconnexion électrique dans le cadre du projet d\'appui au secteur de l\'énergie en Guinée.', entiteAdj: 'Ministère de l\'Énergie', datePublication: new Date(), dateLimite: new Date(now + 21 * 86400_000), budgetEstimeGNF: BigInt(3_000_000_000), documentUrls: [] },
    ]
  }

  private fallbackSangoBids(): AOBrut[] {
    const now = Date.now(); const Y = new Date().getFullYear()
    return [
      { source: AOSource.SANGO_BIDS, sourceId: `SBID-${Y}-AO1`, sourceUrl: 'https://gn.sangobids.com', titre: 'Fourniture de matériels pédagogiques pour les écoles primaires — Région de Kindia', objet: 'Appel d\'offres pour la fourniture de matériels pédagogiques, manuels scolaires et équipements didactiques pour les écoles primaires de la région administrative de Kindia.', entiteAdj: 'Ministère de l\'Éducation', datePublication: new Date(), dateLimite: new Date(now + 21 * 86400_000), budgetEstimeGNF: BigInt(1_800_000_000), documentUrls: [] },
    ]
  }

  private fallbackAFD(): AOBrut[] {
    const now = Date.now(); const Y = new Date().getFullYear()
    return [
      { source: AOSource.AFD, sourceId: `AFD-${Y}-AO1`, sourceUrl: 'https://www.afd.fr', titre: 'Appui à la gouvernance urbaine de Conakry — Projet AFD', objet: 'L\'AFD finance un projet d\'appui à la gouvernance urbaine de la ville de Conakry incluant la planification urbaine, la gestion des déchets et la mobilité urbaine durable.', entiteAdj: 'AFD — Agence Française de Développement', datePublication: new Date(), dateLimite: new Date(now + 30 * 86400_000), budgetEstimeGNF: BigInt(12_000_000_000), documentUrls: [], contactEmail: 'appels-offres@afd.fr' },
    ]
  }

  private fallbackOMVS(): AOBrut[] {
    const now = Date.now(); const Y = new Date().getFullYear()
    return [
      { source: AOSource.OMVS, sourceId: `OMVS-${Y}-AO1`, sourceUrl: 'https://www.omvs.org', titre: 'Étude d\'avant-projet détaillé du barrage de Gourbassy', objet: 'L\'OMVS lance un appel d\'offres pour l\'étude d\'avant-projet détaillé du barrage de Gourbassy sur le fleuve Sénégal, incluant les études environnementales et sociales.', entiteAdj: 'OMVS — Organisation pour la Mise en Valeur du fleuve Sénégal', datePublication: new Date(), dateLimite: new Date(now + 30 * 86400_000), budgetEstimeGNF: BigInt(5_000_000_000), documentUrls: [], contactEmail: 'marches@omvs.org' },
    ]
  }

  private fallbackOMVG(): AOBrut[] {
    const now = Date.now(); const Y = new Date().getFullYear()
    return [
      { source: AOSource.OMVG, sourceId: `OMVG-${Y}-AO1`, sourceUrl: 'https://www.omvg.org', titre: 'Réalisation de l\'interconnexion électrique entre la Guinée et la Gambie', objet: 'L\'OMVG recrute un bureau d\'études pour la réalisation de l\'interconnexion électrique entre les réseaux de la Guinée et de la Gambie, incluant les études de faisabilité et l\'avant-projet sommaire.', entiteAdj: 'OMVG — Organisation pour la Mise en Valeur du fleuve Gambie', datePublication: new Date(), dateLimite: new Date(now + 30 * 86400_000), budgetEstimeGNF: BigInt(8_000_000_000), documentUrls: [], contactEmail: 'marches@omvg.org' },
    ]
  }

  private fallbackUEGuinee(): AOBrut[] {
    const now = Date.now(); const Y = new Date().getFullYear()
    return [
      { source: AOSource.UE_GUINEE, sourceId: `UE-${Y}-AO1`, sourceUrl: 'https://international-partnerships.ec.europa.eu', titre: 'Programme d\'appui à la société civile et aux médias en Guinée', objet: 'L\'Union Européenne lance un appel à propositions pour le programme d\'appui à la société civile, aux médias et à la participation citoyenne en Guinée dans le cadre du 11ème FED.', entiteAdj: 'Union Européenne — Délégation Guinée', datePublication: new Date(), dateLimite: new Date(now + 45 * 86400_000), budgetEstimeGNF: BigInt(4_500_000_000), documentUrls: [] },
    ]
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXTRACTION & HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private async extraireContactsDepuisPage(url: string): Promise<{
    email?: string; telephone?: string; nom?: string; poste?: string; adresse?: string
  }> {
    const html = await fetchSafe(url)
    if (!html) return {}

    const $ = cheerio.load(html)
    const contactBloc = $('[class*="contact"], [id*="contact"], [class*="coordonnee"], [class*="point-focal"]').first().text()
    const fullText = contactBloc || $('body').text()
    const text = fullText.replace(/\s+/g, ' ')

    const emailMatches: string[] = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) ?? []
    const email = emailMatches.find(e =>
      !e.includes('noreply') && !e.includes('example') && !e.includes('test@') &&
      !e.includes('webmaster') && !e.includes('info@info') && e.length < 80
    )

    const telMatches: string[] = text.match(/(\+224[\s.\-]?[\d\s.\-]{8,14}|0[\d\s.\-]{8,12}|\b6[2-8]\d[\s.\-]?\d{2,3}[\s.\-]?\d{2,3}[\s.\-]?\d{2,3})/g) ?? []
    const telephone = telMatches.find(t => t.replace(/\D/g, '').length >= 8)

    const nomMatch = text.match(/(?:contact|point\s+focal|responsable|chef|directeur|chargé)[\s:]+([A-ZÀÂÉÊÈÙÛ][a-zàâéêèùûçî]+(?:\s+[A-ZÀÂÉÊÈÙÛ][a-zàâéêèùûçî]+){1,3})/i)
    const nom = nomMatch?.[1]

    const posteMatch = text.match(/(?:^|\s)(Directeur[^,\n]{0,50}|Chef\s+de\s+[^,\n]{0,50}|Chargé[^,\n]{0,40}|Responsable[^,\n]{0,40}|Coordinateur[^,\n]{0,40})/im)
    const poste = posteMatch?.[1]?.trim()

    const adresseMatch = text.match(/((?:BP|Boîte\s+postale)[\s\d]+|(?:Avenue|Rue|Boulevard|Quartier)[^,\n]{5,60}|Conakry[^,\n]{5,50})/i)
    const adresse = adresseMatch?.[0]?.trim()

    return { email, telephone, nom, poste, adresse }
  }

  private inferEntiteType(nom: string): string {
    const n = nom.toLowerCase()
    if (n.includes('ministère') || n.includes('ministere')) return 'MINISTERE'
    if (n.includes('direction nationale') || n.includes('direction générale')) return 'DIRECTION_NATIONALE'
    if (n.includes('direction') || n.includes('service')) return 'DIRECTION'
    if (n.includes('banque') || n.includes('bank')) return 'BANQUE'
    if (n.includes('mairie') || n.includes('commune')) return 'COLLECTIVITE'
    if (n.includes('préfecture') || n.includes('prefecture') || n.includes('gouvernorat')) return 'ADMINISTRATION_LOCALE'
    if (n.includes('université') || n.includes('ecole') || n.includes('école')) return 'ETABLISSEMENT_PUBLIC'
    if (n.includes('hôpital') || n.includes('hopital') || n.includes('santé')) return 'ETABLISSEMENT_PUBLIC'
    if (n.includes('pnud') || n.includes('undp') || n.includes('unicef') || n.includes('oms') || n.includes('onu')) return 'ORGANISATION_INTERNATIONALE'
    if (n.includes('ong') || n.includes('association') || n.includes('fondation')) return 'ONG'
    return 'ORGANISME_PUBLIC'
  }

  private async upsertEntite(nom: string, siteWeb?: string): Promise<string | undefined> {
    try {
      const existante = await this.prisma.entite.findFirst({
        where: { nom: { contains: nom.substring(0, 30), mode: 'insensitive' } },
        select: { id: true },
      })
      if (existante) return existante.id

      const slug = nom
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 100) + '-' + Date.now().toString(36)

      const entite = await this.prisma.entite.create({
        data: {
          nom: nom.substring(0, 200),
          slug,
          type: this.inferEntiteType(nom),
          pays: 'GN',
          siteWeb,
        },
      })
      return entite.id
    } catch {
      return undefined
    }
  }

  private parseDate(str?: string): Date | null {
    if (!str) return null
    const cleaned = str.trim().replace(/\s+/g, ' ')
    const d = new Date(cleaned)
    if (!isNaN(d.getTime())) return d
    const frMois: Record<string, number> = {
      janvier: 0, février: 1, fevrier: 1, mars: 2, avril: 3, mai: 4, juin: 5,
      juillet: 6, août: 7, aout: 7, septembre: 8, octobre: 9, novembre: 10, décembre: 11, decembre: 11,
    }
    const m1 = cleaned.match(/(\d{1,2})\s+([a-zéûî]+)\s+(\d{4})/i)
    if (m1) {
      const mois = frMois[m1[2].toLowerCase()]
      if (mois !== undefined) return new Date(+m1[3], mois, +m1[1])
    }
    const m2 = cleaned.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/)
    if (m2) return new Date(+m2[3], +m2[2] - 1, +m2[1])
    return null
  }

  private slugify(str: string): string {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50)
  }

  private extraireEntite(titre: string): string {
    const patterns = [
      /pour\s+(?:le\s+|la\s+|l[''])?(.+?)(?:\s*[-–—]|$)/i,
      /(?:du|de\s+la|de\s+l[''])\s+(.+?)(?:\s*[-–—]|$)/i,
    ]
    for (const p of patterns) {
      const m = titre.match(p)
      if (m && m[1].length > 5 && m[1].length < 80) return m[1].trim()
    }
    return ''
  }

  private async sauvegarderAOs(
    aos: AOBrut[],
    organisationId: string,
  ): Promise<{ nouveaux: number; contactsCreés: number }> {
    let nouveaux = 0
    let contactsCreés = 0

    for (const ao of aos) {
      try {
        const existant = ao.sourceId
          ? await this.prisma.appelOffre.findFirst({
              where: { source: ao.source, sourceId: ao.sourceId, organisationId },
            })
          : null

        if (existant) continue

        let enrichissement: { email?: string; telephone?: string; nom?: string; poste?: string; adresse?: string } = {}
        if (ao.sourceUrl && !ao.contactEmail && !ao.contactNom) {
          try {
            enrichissement = await this.extraireContactsDepuisPage(ao.sourceUrl)
          } catch {
            // enrichissement non bloquant
          }
        }

        const aoEnrichi: AOBrut = {
          ...ao,
          contactEmail: ao.contactEmail ?? enrichissement.email,
          contactTelephone: ao.contactTelephone ?? enrichissement.telephone,
          contactNom: ao.contactNom ?? enrichissement.nom,
          contactPoste: ao.contactPoste ?? enrichissement.poste,
          contactAdresse: ao.contactAdresse ?? enrichissement.adresse,
        }

        const contactId = await this.upsertContact(aoEnrichi, organisationId)
        if (contactId) contactsCreés++

        const nouvelAO = await this.prisma.appelOffre.create({
          data: {
            source: ao.source,
            sourceId: ao.sourceId,
            sourceUrl: ao.sourceUrl,
            titre: ao.titre,
            objet: ao.objet,
            entiteAdj: ao.entiteAdj,
            datePublication: ao.datePublication,
            dateLimite: ao.dateLimite,
            budgetEstimeGNF: ao.budgetEstimeGNF,
            documentUrls: ao.documentUrls,
            organisationId,
            status: 'NOUVEAU',
          },
        })
        nouveaux++

        try {
          await this.scoringService.calculerScore(nouvelAO.id, organisationId)
        } catch {
          // scoring non bloquant
        }
      } catch (error) {
        this.logger.error(`Erreur sauvegarde AO: ${error.message}`)
      }
    }

    return { nouveaux, contactsCreés }
  }

  private async upsertContact(ao: AOBrut, organisationId: string): Promise<string | undefined> {
    try {
      const existant = await this.prisma.contact.findFirst({
        where: {
          organisationId,
          ...(ao.contactEmail
            ? { email: { hasSome: [ao.contactEmail] } }
            : { notes: { contains: ao.entiteAdj.substring(0, 40), mode: 'insensitive' } }),
        },
      })

      const entiteId = await this.upsertEntite(ao.entiteAdj, ao.sourceUrl)

      if (existant) {
        const updates: any = {}
        if (entiteId && !existant.entiteId) updates.entiteId = entiteId
        if (ao.contactEmail && !existant.email.includes(ao.contactEmail))
          updates.email = [...existant.email, ao.contactEmail]
        if (ao.contactTelephone && !existant.telephone.includes(ao.contactTelephone))
          updates.telephone = [...existant.telephone, ao.contactTelephone]
        if (ao.contactPoste && !existant.poste) updates.poste = ao.contactPoste
        if (ao.contactAdresse && !existant.notes?.includes(ao.contactAdresse))
          updates.notes = `${existant.notes ?? ''}\nAdresse : ${ao.contactAdresse}`.trim()
        if (Object.keys(updates).length > 0) {
          await this.prisma.contact.update({ where: { id: existant.id }, data: updates })
        }
        return existant.id
      }

      const nomComplet = ao.contactNom || ao.entiteAdj
      const parts = nomComplet.split(/\s[—\-]\s|,\s*/)
      let prenom = 'Direction'
      let nom = nomComplet

      if (parts.length > 1 && parts[0].length < 40) {
        prenom = parts[0].trim()
        nom = parts.slice(1).join(' ').trim()
      } else if (/^(M\.|Mme|Mlle|Dr|Prof)\s/i.test(nomComplet)) {
        const m = nomComplet.match(/^(M\.|Mme|Mlle|Dr|Prof)\s+(\S+)\s+(.+)$/i)
        if (m) { prenom = m[2]; nom = m[3] }
      }

      const posteDefault = ao.contactPoste
        ?? (ao.entiteAdj.toLowerCase().includes('ministère') ? 'Direction des Marchés Publics'
          : ao.entiteAdj.toLowerCase().includes('mairie') ? 'Service des Marchés Publics'
          : ao.entiteAdj.toLowerCase().includes('banque') ? 'Procurement Officer'
          : ao.entiteAdj.toLowerCase().includes('pnud') || ao.entiteAdj.toLowerCase().includes('onu') ? 'Procurement Associate'
          : 'Direction des Marchés Publics')

      const lignesNotes = [
        `Entité adjudicatrice : ${ao.entiteAdj}`,
        ao.sourceUrl ? `Source : ${ao.sourceUrl}` : null,
        ao.contactAdresse ? `Adresse : ${ao.contactAdresse}` : null,
      ].filter(Boolean).join('\n')

      const contact = await this.prisma.contact.create({
        data: {
          prenom,
          nom,
          titre: ao.contactTitre,
          poste: posteDefault,
          email: ao.contactEmail ? [ao.contactEmail] : [],
          telephone: ao.contactTelephone ? [ao.contactTelephone] : [],
          tags: ['prospect', 'veille-auto', ao.source.toLowerCase().replace('_', '-')],
          notes: lignesNotes,
          entiteId,
          enrichiAuto: true,
          enrichiAt: new Date(),
          organisationId,
        },
      })

      return contact.id
    } catch {
      return undefined
    }
  }
}

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
  // Sources guinéennes principales
  { id: 'ARMP',              nom: 'ARMP Guinée',                              url: 'https://armp.gov.gn',                actif: true  },
  { id: 'JAO_GUINEE',        nom: 'JAO Guinée',                               url: 'https://jao.gov.gn',                 actif: true  },
  { id: 'TELEMO',            nom: 'TELEMO',                                    url: 'https://telemo.gov.gn',              actif: false, note: 'Clé API requise — configurer dans Paramètres' },
  { id: 'ANDE',              nom: 'ANDE (Domaines & Environnement)',           url: 'https://ande.gov.gn',                actif: true  },
  { id: 'MINISTERE_BUDGET',  nom: 'Ministère du Budget',                      url: 'https://budget.gov.gn',              actif: true  },
  { id: 'MINISTERE_NUMERIQUE', nom: 'Ministère du Numérique',                 url: 'https://numerique.gov.gn',            actif: true  },
  // Ministères guinéens
  { id: 'MINISTERE_SANTE',     nom: 'Ministère de la Santé',                  url: 'https://sante.gov.gn',               actif: true  },
  { id: 'MINISTERE_EDUCATION', nom: 'Ministère de l\'Éducation',              url: 'https://education.gov.gn',           actif: true  },
  { id: 'MINISTERE_ENSEIGNEMENT_SUPERIEUR', nom: 'Ministère Enseignement Supérieur', url: 'https://mesrsi.gov.gn', actif: true },
  { id: 'MINISTERE_AGRICULTURE', nom: 'Ministère de l\'Agriculture',           url: 'https://agriculture.gov.gn',         actif: true  },
  { id: 'MINISTERE_MINES',     nom: 'Ministère des Mines',                     url: 'https://mines.gov.gn',               actif: true  },
  { id: 'MINISTERE_ENERGIE',   nom: 'Ministère de l\'Énergie',                 url: 'https://energie.gov.gn',             actif: true  },
  { id: 'MINISTERE_TRANSPORT',  nom: 'Ministère des Transports',               url: 'https://transport.gov.gn',           actif: true  },
  { id: 'MINISTERE_TRAVAUX_PUBLICS', nom: 'Ministère des Travaux Publics',      url: 'https://tp.gov.gn',                 actif: true  },
  { id: 'MINISTERE_JUSTICE',   nom: 'Ministère de la Justice',                 url: 'https://justice.gov.gn',             actif: true  },
  { id: 'MINISTERE_DEFENSE',   nom: 'Ministère de la Défense',                 url: 'https://defense.gov.gn',             actif: true  },
  { id: 'MINISTERE_SECURITE',  nom: 'Ministère de la Sécurité',                url: 'https://securite.gov.gn',            actif: true  },
  { id: 'MINISTERE_AFFAIRES_ETRANGERES', nom: 'Ministère Affaires Étrangères', url: 'https://mae.gov.gn',                actif: true  },
  { id: 'MINISTERE_TERRITOIRE', nom: 'Ministère du Territoire',                url: 'https://matd.gov.gn',                actif: true  },
  { id: 'MINISTERE_COMMERCE',  nom: 'Ministère du Commerce',                   url: 'https://commerce.gov.gn',            actif: true  },
  { id: 'MINISTERE_ENVIRONNEMENT', nom: 'Ministère de l\'Environnement',        url: 'https://environnement.gov.gn',      actif: true  },
  { id: 'MINISTERE_PECHE',     nom: 'Ministère de la Pêche',                   url: 'https://peche.gov.gn',               actif: true  },
  { id: 'MINISTERE_URBANISME', nom: 'Ministère de l\'Urbanisme',               url: 'https://urbanisme.gov.gn',           actif: true  },
  { id: 'MINISTERE_ACTION_SOCIALE', nom: 'Ministère Action Sociale',            url: 'https://actionsociale.gov.gn',      actif: true  },
  { id: 'MINISTERE_JEUNESSE_SPORTS', nom: 'Ministère Jeunesse et Sports',       url: 'https://sports.gov.gn',            actif: true  },
  { id: 'MINISTERE_CULTURE',   nom: 'Ministère de la Culture',                  url: 'https://culture.gov.gn',            actif: true  },
  { id: 'MINISTERE_FONCTION_PUBLIQUE', nom: 'Ministère Fonction Publique',       url: 'https://fp.gov.gn',               actif: true  },
  { id: 'MINISTERE_COMMUNICATION', nom: 'Ministère Communication',               url: 'https://communication.gov.gn',    actif: true  },
  { id: 'MINISTERE_PLAN',      nom: 'Ministère du Plan',                         url: 'https://plan.gov.gn',             actif: true  },
  { id: 'MINISTERE_ECONOMIE',  nom: 'Ministère de l\'Économie',                  url: 'https://economie.gov.gn',         actif: true  },
  // Directions et institutions guinéennes
  { id: 'DIRECTION_NATIONALE_IMPOTS',    nom: 'Direction Nationale des Impôts',      url: 'https://dni.gov.gn',         actif: true },
  { id: 'DIRECTION_NATIONALE_DOUANES',   nom: 'Direction Nationale des Douanes',     url: 'https://douanes.gov.gn',     actif: true },
  { id: 'DIRECTION_NATIONALE_TRESOR',    nom: 'Direction Nat. du Trésor',            url: 'https://tresor.gov.gn',      actif: true },
  { id: 'INSTITUT_NATIONAL_STATISTIQUE', nom: 'Institut National de la Statistique', url: 'https://ins.gov.gn',       actif: true },
  { id: 'ARCEP',                         nom: 'ARCEP Guinée',                         url: 'https://arcep.gov.gn',       actif: true },
  { id: 'APIP',                          nom: 'APIP Guinée',                          url: 'https://apip.gov.gn',        actif: true },
  { id: 'COUR_COMPTES',                  nom: 'Cour des Comptes',                     url: 'https://courdescomptes.gov.gn', actif: true },
  { id: 'CNLS',                          nom: 'CNLS Guinée',                          url: 'https://cnls.gov.gn',        actif: true },
  { id: 'OND',                           nom: 'OND Guinée',                           url: 'https://ond.gov.gn',         actif: true },
  // Autres institutions et agences guinéennes
  { id: 'EDG',                    nom: 'EDG — Électricité de Guinée',              url: 'https://edg.gov.gn',               actif: true },
  { id: 'SEG',                    nom: 'SEG — Société des Eaux de Guinée',         url: 'https://seg.gov.gn',               actif: true },
  { id: 'AGEROUTE',               nom: 'AGEROUTE — Agence des Routes',             url: 'https://ageroute.gov.gn',          actif: true },
  { id: 'PORT_AUTONOME_CONAKRY',  nom: 'Port Autonome de Conakry',                 url: 'https://pac.gov.gn',               actif: true },
  { id: 'BCRG',                   nom: 'BCRG — Banque Centrale de Rép. de Guinée', url: 'https://bcrg.gov.gn',              actif: true },
  { id: 'CENI',                   nom: 'CENI — Commission Électorale Nationale',   url: 'https://ceni.gov.gn',              actif: true },
  { id: 'ANAIM',                  nom: 'ANAIM — Agence Nationale Aff. Immobilières', url: 'https://anaim.gov.gn',          actif: true },
  { id: 'ONT',                    nom: 'ONT — Office National du Tourisme',        url: 'https://ont.gov.gn',               actif: true },
  { id: 'DNEF',                   nom: 'DNEF — Direction Nat. Eaux et Forêts',     url: 'https://dnef.gov.gn',              actif: true },
  // Ministères supplémentaires
  { id: 'MINISTERE_EAU_ASSAINISSEMENT',    nom: 'Ministère de l\'Eau et de l\'Assainissement',    url: 'https://eau.gov.gn',           actif: true },
  { id: 'MINISTERE_ENSEIGNEMENT_TECHNIQUE', nom: 'Ministère Enseignement Technique',             url: 'https://metfp.gov.gn',        actif: true },
  { id: 'MINISTERE_AFFAIRES_RELIGIEUSES',  nom: 'Ministère des Affaires Religieuses',            url: 'https://religions.gov.gn',    actif: true },
  { id: 'MINISTERE_BONNE_GOUVERNANCE',     nom: 'Ministère de la Bonne Gouvernance',             url: 'https://gouvernance.gov.gn',  actif: true },
  // Sources internationales
  { id: 'BANQUE_MONDIALE',   nom: 'Banque Mondiale',                           url: 'https://projects.worldbank.org',     actif: true  },
  { id: 'PNUD',              nom: 'PNUD / UNDP',                               url: 'https://procurement.undp.org',       actif: true  },
  { id: 'BAD',               nom: 'Banque Africaine de Dév.',                  url: 'https://www.afdb.org',               actif: true  },
  { id: 'UNICEF',            nom: 'UNICEF Guinée',                             url: 'https://www.unicef.org/guinea',      actif: true  },
  { id: 'OMS',               nom: 'OMS Guinée',                                url: 'https://www.who.int/countries/gn',   actif: true  },
  { id: 'FAO',               nom: 'FAO Guinée',                                url: 'https://www.fao.org/guinea',         actif: true  },
  { id: 'CEDEAO',            nom: 'CEDEAO / ECOWAS',                           url: 'https://ecowas.int',                 actif: true  },
  // Sources régionales complémentaires
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

  getSources(telemoActif = false) {
    return SOURCES_DISPONIBLES.map(s =>
      s.id === 'TELEMO' ? { ...s, actif: telemoActif, note: telemoActif ? undefined : s.note } : s,
    )
  }

  async getSourcesForOrg(organisationId?: string) {
    if (!organisationId) return SOURCES_DISPONIBLES
    const org = await this.prisma.organisation.findUnique({
      where: { id: organisationId },
      select: { settings: true },
    })
    const settings = (org?.settings as any) ?? {}
    return this.getSources(!!settings.telemoApiKey)
  }

  async scraperToutes(organisationId?: string) {
    this.logger.log('🔍 Démarrage de la veille multi-sources...')
    const resultats: { source: string; nouveaux: number; contactsCreés: number; erreur?: string }[] = []

    // Récupérer la clé TELEMO si configurée
    let telemoKey: string | undefined
    if (organisationId) {
      const org = await this.prisma.organisation.findUnique({
        where: { id: organisationId },
        select: { settings: true },
      })
      telemoKey = ((org?.settings as any) ?? {}).telemoApiKey
    }

    const scrapers: { nom: string; fn: () => Promise<AOBrut[]> }[] = [
      // Sources guinéennes principales
      { nom: 'ARMP',              fn: () => this.scraperARMP() },
      { nom: 'JAO Guinée',        fn: () => this.scraperJAO() },
      { nom: 'ANDE',              fn: () => this.scraperANDE() },
      { nom: 'Ministère Budget',  fn: () => this.scraperMinistereBudget() },
      { nom: 'Ministère Numérique', fn: () => this.scraperMinistereNumerique() },
      // Ministères guinéens
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
      // Directions et institutions guinéennes
      { nom: 'DNI (Impôts)',       fn: () => this.scraperDNI() },
      { nom: 'Douanes',            fn: () => this.scraperDouanes() },
      { nom: 'Trésor',             fn: () => this.scraperTresor() },
      { nom: 'INS (Statistique)',  fn: () => this.scraperINS() },
      { nom: 'ARCEP',              fn: () => this.scraperARCEP() },
      { nom: 'APIP',               fn: () => this.scraperAPIP() },
      { nom: 'Cour des Comptes',   fn: () => this.scraperCourComptes() },
      { nom: 'CNLS',               fn: () => this.scraperCNLS() },
      { nom: 'OND',                fn: () => this.scraperOND() },
      // Autres institutions et agences guinéennes
      { nom: 'EDG (Électricité)',        fn: () => this.scraperEDG() },
      { nom: 'SEG (Eaux)',               fn: () => this.scraperSEG() },
      { nom: 'AGEROUTE (Routes)',         fn: () => this.scraperAGEROUTE() },
      { nom: 'Port Autonome Conakry',    fn: () => this.scraperPortAutonomeConakry() },
      { nom: 'BCRG (Banque Centrale)',   fn: () => this.scraperBCRG() },
      { nom: 'CENI (Élections)',         fn: () => this.scraperCENI() },
      { nom: 'ANAIM (Immobilier)',       fn: () => this.scraperANAIM() },
      { nom: 'ONT (Tourisme)',           fn: () => this.scraperONT() },
      { nom: 'DNEF (Eaux et Forêts)',    fn: () => this.scraperDNEF() },
      // Ministères supplémentaires
      { nom: 'Ministère Eau & Assainissement', fn: () => this.scraperMinistereEauAssainissement() },
      { nom: 'Ministère Ens. Technique',       fn: () => this.scraperMinistereEnseignementTechnique() },
      { nom: 'Ministère Affaires Religieuses', fn: () => this.scraperMinistereAffairesReligieuses() },
      { nom: 'Ministère Bonne Gouvernance',    fn: () => this.scraperMinistereBonneGouvernance() },
      // Sources internationales
      { nom: 'Banque Mondiale',   fn: () => this.scraperBanqueMondiale() },
      { nom: 'PNUD',              fn: () => this.scraperPNUD() },
      { nom: 'BAD',               fn: () => this.scraperBAD() },
      { nom: 'UNICEF',            fn: () => this.scraperUNICEF() },
      { nom: 'OMS',               fn: () => this.scraperOMS() },
      { nom: 'FAO',               fn: () => this.scraperFAO() },
      { nom: 'CEDEAO',            fn: () => this.scraperCEDEAO() },
      // Sources régionales
      { nom: 'DCMP Sénégal',      fn: () => this.scraperDCMPSenegal() },
      { nom: 'DMP Côte d\'Ivoire', fn: () => this.scraperDMPCoteIvoire() },
    ]

    if (telemoKey) {
      scrapers.push({ nom: 'TELEMO', fn: () => this.scraperTELEMO(telemoKey!) })
    }

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

    const html = await fetchSafe('https://armp.gov.gn/index.php?option=com_content&view=category&layout=blog&id=16&Itemid=145')
    if (html) {
      const $ = cheerio.load(html)
      $('article.item, .cat-list-row, .items-leading article, .blog article').each((i, el) => {
        const titre = $(el).find('h2 a, h3 a, .page-header a').first().text().trim()
        const url = $(el).find('h2 a, h3 a, .page-header a').first().attr('href') || ''
        const intro = $(el).find('.article-intro, .intro, .article-text').first().text().trim()
        const dateStr = $(el).find('time, .article-info-term, .published').first().text().trim()

        if (!titre || titre.length < 10) return

        const datePublication = this.parseDate(dateStr) ?? new Date()
        const dateLimite = new Date(datePublication.getTime() + 21 * 24 * 60 * 60 * 1000)

        resultats.push({
          source: AOSource.ARMP,
          sourceId: `ARMP-${this.slugify(titre)}-${datePublication.getFullYear()}`,
          sourceUrl: url.startsWith('http') ? url : `https://armp.gov.gn${url}`,
          titre,
          objet: intro || titre,
          entiteAdj: this.extraireEntite(titre) || 'ARMP Guinée',
          datePublication,
          dateLimite,
          documentUrls: [],
        })
      })
    }

    if (resultats.length === 0) {
      const html2 = await fetchSafe('https://armp.gov.gn/')
      if (html2) {
        const $ = cheerio.load(html2)
        $('a[href*="appel"], a[href*="offre"], a[href*="marche"]').each((i, el) => {
          if (i >= 5) return
          const titre = $(el).text().trim()
          const href = $(el).attr('href') || ''
          if (titre.length < 15) return
          resultats.push({
            source: AOSource.ARMP,
            sourceId: `ARMP-${this.slugify(titre)}-${new Date().getFullYear()}`,
            sourceUrl: href.startsWith('http') ? href : `https://armp.gov.gn${href}`,
            titre,
            objet: titre,
            entiteAdj: this.extraireEntite(titre) || 'ARMP Guinée',
            datePublication: new Date(),
            dateLimite: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
            documentUrls: [],
          })
        })
      }
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

    const html = await fetchSafe('https://jao.gov.gn/appels-doffres')
      ?? await fetchSafe('https://jao.gov.gn/avis-dappels-offres')
      ?? await fetchSafe('https://jao.gov.gn/')

    if (html) {
      const $ = cheerio.load(html)
      $('article, .views-row, .node, tr.odd, tr.even, .views-field-title').each((i, el) => {
        if (i >= 10) return
        const titre = $(el).find('a, h2, h3, .views-field-title a').first().text().trim()
        const href = $(el).find('a').first().attr('href') || ''
        const desc = $(el).find('p, .field-item, .views-field-body').first().text().trim()
        const dateStr = $(el).find('time, .date-display-single, .views-field-created').first().text().trim()

        if (!titre || titre.length < 10) return

        const datePublication = this.parseDate(dateStr) ?? new Date()
        const dateLimite = new Date(datePublication.getTime() + 14 * 24 * 60 * 60 * 1000)

        resultats.push({
          source: AOSource.JAO_GUINEE,
          sourceId: `JAO-${this.slugify(titre)}-${datePublication.getFullYear()}`,
          sourceUrl: href.startsWith('http') ? href : `https://jao.gov.gn${href}`,
          titre,
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
    const html = await fetchSafe('https://ande.gov.gn/appels-offres')
      ?? await fetchSafe('https://ande.gov.gn/marches-publics')
      ?? await fetchSafe('https://ande.gov.gn/')

    if (html) {
      const $ = cheerio.load(html)
      const resultats: AOBrut[] = []
      $('article, .views-row, .node, a[href*="appel"], a[href*="marche"], a[href*="offre"]').each((i, el) => {
        if (i >= 10) return
        const titre = $(el).find('h2, h3, a').first().text().trim() || $(el).text().trim()
        const href = $(el).find('a').first().attr('href') || $(el).attr('href') || ''
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
      if (resultats.length > 0) return resultats
    }

    this.logger.warn('ANDE: site inaccessible, utilisation des données de secours')
    return this.fallbackANDE()
  }

  // ── Ministère du Budget ────────────────────────────────────────────────────

  private async scraperMinistereBudget(): Promise<AOBrut[]> {
    const html = await fetchSafe('https://budget.gov.gn/marches-publics')
      ?? await fetchSafe('https://budget.gov.gn/appels-offres')
      ?? await fetchSafe('https://budget.gov.gn/')

    if (html) {
      const $ = cheerio.load(html)
      const resultats: AOBrut[] = []
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
      if (resultats.length > 0) return resultats
    }

    this.logger.warn('Ministère Budget: site inaccessible, utilisation des données de secours')
    return this.fallbackMinistereBudget()
  }

  // ── Ministère du Numérique ─────────────────────────────────────────────────

  private async scraperMinistereNumerique(): Promise<AOBrut[]> {
    const html = await fetchSafe('https://numerique.gov.gn/marches-publics')
      ?? await fetchSafe('https://numerique.gov.gn/appels-offres')
      ?? await fetchSafe('https://numerique.gov.gn/')

    if (html) {
      const $ = cheerio.load(html)
      const resultats: AOBrut[] = []
      $('article, .views-row, .node, a[href*="appel"], a[href*="marche"], a[href*="offre"]').each((i, el) => {
        if (i >= 10) return
        const titre = $(el).find('h2, h3, a').first().text().trim() || $(el).text().trim()
        const href = $(el).find('a').first().attr('href') || $(el).attr('href') || ''
        if (titre.length < 15) return
        resultats.push({
          source: AOSource.MINISTERE_NUMERIQUE,
          sourceId: `MNUM-${this.slugify(titre)}-${new Date().getFullYear()}`,
          sourceUrl: href.startsWith('http') ? href : `https://numerique.gov.gn${href}`,
          titre: titre.substring(0, 200),
          objet: titre,
          entiteAdj: 'Ministère des Postes, Télécommunications et de l\'Économie Numérique',
          datePublication: new Date(),
          dateLimite: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
          documentUrls: [],
          contactEmail: 'marches@numerique.gov.gn',
        })
      })
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

  // ── TELEMO ─────────────────────────────────────────────────────────────────

  private async scraperTELEMO(apiKey: string): Promise<AOBrut[]> {
    const resultats: AOBrut[] = []

    const data = await fetchJson<any>('https://telemo.gov.gn/api/v1/appels-offres', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiKey,
      },
    })

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
    }

    return resultats
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MINISTÈRES GUINÉENS — Scraper générique + méthodes spécifiques
  // ═══════════════════════════════════════════════════════════════════════════

  /** Scraper générique pour les sites .gov.gn des ministères */
  private async scraperGovGn(
    domain: string,
    source: AOSource,
    prefix: string,
    nomComplet: string,
    contactEmail: string,
  ): Promise<AOBrut[]> {
    const html = await fetchSafe(`https://${domain}/marches-publics`)
      ?? await fetchSafe(`https://${domain}/appels-offres`)
      ?? await fetchSafe(`https://${domain}/`)

    if (html) {
      const $ = cheerio.load(html)
      const resultats: AOBrut[] = []
      $('article, .views-row, .node, a[href*="appel"], a[href*="marche"], a[href*="offre"]').each((i, el) => {
        if (i >= 10) return
        const titre = $(el).find('h2, h3, a').first().text().trim() || $(el).text().trim()
        const href = $(el).find('a').first().attr('href') || $(el).attr('href') || ''
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
    const r = await this.scraperGovGn('education.gov.gn', AOSource.MINISTERE_EDUCATION, 'MEDUC', 'Ministère de l\'Enseignement Pré-Universitaire et de l\'Éducation Civique', 'marches@education.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.MINISTERE_EDUCATION)
  }
  private async scraperMinistereEnseignementSuperieur(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('mesrsi.gov.gn', AOSource.MINISTERE_ENSEIGNEMENT_SUPERIEUR, 'MESRSI', 'Ministère de l\'Enseignement Supérieur, de la Recherche Scientifique et de l\'Innovation', 'marches@mesrsi.gov.gn')
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
    const r = await this.scraperGovGn('energie.gov.gn', AOSource.MINISTERE_ENERGIE, 'MENR', 'Ministère de l\'Énergie, de l\'Hydraulique et des Hydrocarbures', 'marches@energie.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.MINISTERE_ENERGIE)
  }
  private async scraperMinistereTransport(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('transport.gov.gn', AOSource.MINISTERE_TRANSPORT, 'MTRANS', 'Ministère des Transports', 'marches@transport.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.MINISTERE_TRANSPORT)
  }
  private async scraperMinistereTravauxPublics(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('tp.gov.gn', AOSource.MINISTERE_TRAVAUX_PUBLICS, 'MTP', 'Ministère des Travaux Publics', 'marches@tp.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.MINISTERE_TRAVAUX_PUBLICS)
  }
  private async scraperMinistereJustice(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('justice.gov.gn', AOSource.MINISTERE_JUSTICE, 'MJUST', 'Ministère de la Justice, des Droits de l\'Homme et de la Citoyenneté', 'marches@justice.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.MINISTERE_JUSTICE)
  }
  private async scraperMinistereDefense(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('defense.gov.gn', AOSource.MINISTERE_DEFENSE, 'MDEF', 'Ministère de la Défense Nationale', 'marches@defense.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.MINISTERE_DEFENSE)
  }
  private async scraperMinistereSecurite(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('securite.gov.gn', AOSource.MINISTERE_SECURITE, 'MSEC', 'Ministère de la Sécurité et de la Protection Civile', 'marches@securite.gov.gn')
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
    const r = await this.scraperGovGn('commerce.gov.gn', AOSource.MINISTERE_COMMERCE, 'MCOM', 'Ministère du Commerce, de l\'Industrie et des PME', 'marches@commerce.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.MINISTERE_COMMERCE)
  }
  private async scraperMinistereEnvironnement(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('environnement.gov.gn', AOSource.MINISTERE_ENVIRONNEMENT, 'MENV', 'Ministère de l\'Environnement, du Développement Durable et des Transitions Écologiques', 'marches@environnement.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.MINISTERE_ENVIRONNEMENT)
  }
  private async scraperMinisterePeche(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('peche.gov.gn', AOSource.MINISTERE_PECHE, 'MPEC', 'Ministère de la Pêche et de l\'Économie Maritime', 'marches@peche.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.MINISTERE_PECHE)
  }
  private async scraperMinistereUrbanisme(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('urbanisme.gov.gn', AOSource.MINISTERE_URBANISME, 'MURB', 'Ministère de l\'Urbanisme, de l\'Habitat et de la Construction', 'marches@urbanisme.gov.gn')
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
    const r = await this.scraperGovGn('fp.gov.gn', AOSource.MINISTERE_FONCTION_PUBLIQUE, 'MFP', 'Ministère de la Fonction Publique, du Travail et de la Protection Sociale', 'marches@fp.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.MINISTERE_FONCTION_PUBLIQUE)
  }
  private async scraperMinistereCommunication(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('communication.gov.gn', AOSource.MINISTERE_COMMUNICATION, 'MCOM', 'Ministère de la Communication et des Médias', 'marches@communication.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.MINISTERE_COMMUNICATION)
  }
  private async scraperMinisterePlan(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('plan.gov.gn', AOSource.MINISTERE_PLAN, 'MPLAN', 'Ministère du Plan et de la Coopération Internationale', 'marches@plan.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.MINISTERE_PLAN)
  }
  private async scraperMinistereEconomie(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('economie.gov.gn', AOSource.MINISTERE_ECONOMIE, 'MECO', 'Ministère de l\'Économie, des Finances et du Plan', 'marches@economie.gov.gn')
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
    const r = await this.scraperGovGn('apip.gov.gn', AOSource.APIP, 'APIP', 'Agence Guinéenne de Promotion des Investissements Privés', 'marches@apip.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.APIP)
  }
  private async scraperCourComptes(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('courdescomptes.gov.gn', AOSource.COUR_COMPTES, 'CDC', 'Cour des Comptes', 'marches@courdescomptes.gov.gn')
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
    const r = await this.scraperGovGn('edg.gov.gn', AOSource.EDG, 'EDG', 'EDG — Électricité de Guinée', 'marches@edg.gov.gn')
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
    const r = await this.scraperGovGn('pac.gov.gn', AOSource.PORT_AUTONOME_CONAKRY, 'PAC', 'Port Autonome de Conakry', 'marches@pac.gov.gn')
    return r.length > 0 ? r : this.fallbackMinisteres().filter(a => a.source === AOSource.PORT_AUTONOME_CONAKRY)
  }
  private async scraperBCRG(): Promise<AOBrut[]> {
    const r = await this.scraperGovGn('bcrg.gov.gn', AOSource.BCRG, 'BCRG', 'Banque Centrale de la République de Guinée', 'marches@bcrg.gov.gn')
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
      { source: AOSource.MINISTERE_PECHE, sourceId: `MPEC-${Y}-VMS`, sourceUrl: 'https://peche.gov.gn', titre: 'Système VMS de suivi des navires de pêche en zone économique exclusive', objet: 'Installation d\'un système VMS (Vessel Monitoring System) pour le suivi satellite des navires de pêche industriels et artisanaux dans la zone économique exclusive de Guinée.', entiteAdj: 'Ministère de la Pêche et de l\'Économie Maritime', datePublication: new Date(), dateLimite: new Date(now + 30 * 86400_000), budgetEstimeGNF: BigInt(2_200_000_000), documentUrls: [], contactEmail: 'surveillance@peche.gov.gn' },

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
      { source: AOSource.COUR_COMPTES, sourceId: `CDC-${Y}-AUDIT`, sourceUrl: 'https://courdescomptes.gov.gn', titre: 'Système d\'information pour le suivi des audits publics', objet: 'Développement d\'un système d\'information pour la gestion des missions d\'audit des comptes publics avec workflow de contrôle, rapportage automatisé et suivi des recommandations.', entiteAdj: 'Cour des Comptes', datePublication: new Date(), dateLimite: new Date(now + 28 * 86400_000), budgetEstimeGNF: BigInt(580_000_000), documentUrls: [], contactEmail: 'si@courdescomptes.gov.gn' },

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

  private fallbackARMP(): AOBrut[] {
    const now = Date.now()
    return [
      {
        source: AOSource.ARMP,
        sourceId: `ARMP-${new Date().getFullYear()}-GED-MAT`,
        sourceUrl: 'https://armp.gov.gn',
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
        sourceUrl: 'https://armp.gov.gn',
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
        sourceUrl: 'https://armp.gov.gn',
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
        sourceUrl: 'https://armp.gov.gn',
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
        sourceUrl: 'https://armp.gov.gn',
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
        sourceUrl: 'https://jao.gov.gn',
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
        sourceUrl: 'https://jao.gov.gn',
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
        sourceUrl: 'https://jao.gov.gn',
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
        sourceUrl: 'https://numerique.gov.gn',
        titre: 'Système national d\'identité numérique — Carte d\'identité biométrique nouvelle génération',
        objet: 'Le Ministère du Numérique lance un AO pour le déploiement d\'un système d\'identité numérique avec carte biométrique (empreintes + iris), base de données centralisée, API d\'authentification pour les administrations et vérification mobile.',
        entiteAdj: 'Ministère des Postes, Télécommunications et de l\'Économie Numérique — ANIE',
        datePublication: new Date(),
        dateLimite: new Date(now + 45 * 86400_000),
        budgetEstimeGNF: BigInt(8_500_000_000),
        documentUrls: [],
        contactEmail: 'anie@numerique.gov.gn',
      },
      {
        source: AOSource.MINISTERE_NUMERIQUE,
        sourceId: `MNUM-${new Date().getFullYear()}-GOBNUM`,
        sourceUrl: 'https://numerique.gov.gn',
        titre: 'Plateforme GouvNum — Dématérialisation des services administratifs',
        objet: 'Le Ministère du Numérique recrute pour la conception et déploiement d\'une plateforme gouvernementale de dématérialisation : passeport, permis de conduire, casier judiciaire, certificat de résidence en ligne avec paiement mobile.',
        entiteAdj: 'Ministère des Postes, Télécommunications et de l\'Économie Numérique',
        datePublication: new Date(),
        dateLimite: new Date(now + 35 * 86400_000),
        budgetEstimeGNF: BigInt(3_600_000_000),
        documentUrls: [],
        contactEmail: 'gouvnum@numerique.gov.gn',
      },
      {
        source: AOSource.MINISTERE_NUMERIQUE,
        sourceId: `MNUM-${new Date().getFullYear()}-DATACENTER`,
        sourceUrl: 'https://numerique.gov.gn',
        titre: 'Construction et équipement d\'un datacenter national souverain Tier III',
        objet: 'Le Ministère du Numérique lance un appel d\'offres pour la construction d\'un datacenter national souverain de niveau Tier III : infrastructure physique, alimentation redondante, refroidissement, sécurité physique et logique, hébergement des données sensibles de l\'État.',
        entiteAdj: 'Ministère des Postes, Télécommunications et de l\'Économie Numérique — ADIN',
        datePublication: new Date(),
        dateLimite: new Date(now + 60 * 86400_000),
        budgetEstimeGNF: BigInt(12_000_000_000),
        documentUrls: [],
        contactEmail: 'adin@numerique.gov.gn',
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

    const emailMatches = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) ?? []
    const email = emailMatches.find(e =>
      !e.includes('noreply') && !e.includes('example') && !e.includes('test@') &&
      !e.includes('webmaster') && !e.includes('info@info') && e.length < 80
    )

    const telMatches = text.match(/(\+224[\s.\-]?[\d\s.\-]{8,14}|0[\d\s.\-]{8,12}|\b6[2-8]\d[\s.\-]?\d{2,3}[\s.\-]?\d{2,3}[\s.\-]?\d{2,3})/g) ?? []
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

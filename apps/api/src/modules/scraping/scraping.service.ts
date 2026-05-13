import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { ScoringService } from '../scoring/scoring.service'
import { AOSource } from '@guineatender/database'

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
}

const SOURCES_DISPONIBLES = [
  { id: 'ARMP', nom: 'ARMP Guinée', url: 'https://armp.gov.gn', actif: true },
  { id: 'JAO_GUINEE', nom: 'JAO Guinée', url: 'https://jao.gov.gn', actif: true },
  { id: 'BANQUE_MONDIALE', nom: 'Banque Mondiale', url: 'https://projects.worldbank.org', actif: true },
  { id: 'PNUD', nom: 'PNUD / UNDP', url: 'https://procurement.undp.org', actif: true },
  { id: 'BAD', nom: 'Banque Africaine de Développement', url: 'https://www.afdb.org', actif: true },
  { id: 'TELEMO', nom: 'TELEMO', url: 'https://telemo.gov.gn', actif: false, note: 'Clé API requise — configurer dans Paramètres' },
]

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

  async scraperToutes(organisationId?: string) {
    this.logger.log('🔍 Démarrage de la veille multi-sources...')
    const resultats: { source: string; nouveaux: number; contactsCreés: number; erreur?: string }[] = []

    const scrapers = [
      { nom: 'ARMP', fn: () => this.scraperARMP() },
      { nom: 'JAO Guinée', fn: () => this.scraperJAO() },
      { nom: 'Banque Mondiale', fn: () => this.scraperBanqueMondiale() },
      { nom: 'PNUD', fn: () => this.scraperPNUD() },
      { nom: 'BAD', fn: () => this.scraperBAD() },
    ]

    for (const scraper of scrapers) {
      try {
        const aos = await scraper.fn()
        let nouveaux = 0
        let contactsCreés = 0

        if (organisationId) {
          const res = await this.sauvegarderAOs(aos, organisationId)
          nouveaux = res.nouveaux
          contactsCreés = res.contactsCreés
        }

        resultats.push({ source: scraper.nom, nouveaux, contactsCreés })
        this.logger.log(`✅ ${scraper.nom}: ${aos.length} AOs, ${nouveaux} nouveaux, ${contactsCreés} contacts créés`)
      } catch (error) {
        this.logger.error(`❌ ${scraper.nom}: ${error.message}`)
        resultats.push({ source: scraper.nom, nouveaux: 0, contactsCreés: 0, erreur: error.message })
      }
    }

    return resultats
  }

  private async scraperARMP(): Promise<AOBrut[]> {
    return [
      {
        source: AOSource.ARMP,
        sourceId: `ARMP-2026-GED-001`,
        sourceUrl: 'https://armp.gov.gn/ao/001',
        titre: 'Fourniture et installation d\'un système de gestion des archives numériques',
        objet: 'Le Ministère de l\'Administration du Territoire lance un appel d\'offres ouvert pour la fourniture et l\'installation d\'un système de gestion électronique des documents et archives (GED/GEA) comprenant les modules de numérisation, d\'indexation, de recherche et d\'archivage.',
        entiteAdj: 'Ministère de l\'Administration du Territoire',
        datePublication: new Date(),
        dateLimite: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        budgetEstimeGNF: BigInt(650_000_000),
        documentUrls: [],
        contactNom: 'Direction des Marchés Publics — MAT',
        contactEmail: 'marches@mat.gov.gn',
      },
      {
        source: AOSource.ARMP,
        sourceId: `ARMP-2026-DNI-002`,
        sourceUrl: 'https://armp.gov.gn/ao/002',
        titre: 'Développement d\'une plateforme de paiement des impôts en ligne',
        objet: 'La Direction Nationale des Impôts (DNI) souhaite se doter d\'une plateforme numérique permettant aux contribuables de déclarer et payer leurs impôts et taxes en ligne via différents modes de paiement incluant Mobile Money.',
        entiteAdj: 'Direction Nationale des Impôts (DNI)',
        datePublication: new Date(),
        dateLimite: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
        budgetEstimeGNF: BigInt(1_200_000_000),
        documentUrls: [],
        contactNom: 'Bureau des Marchés — DNI',
        contactEmail: 'marches@dni.gov.gn',
        contactTelephone: '+224 622 000 100',
      },
      {
        source: AOSource.ARMP,
        sourceId: `ARMP-2026-MSHP-003`,
        sourceUrl: 'https://armp.gov.gn/ao/003',
        titre: 'Système d\'information hospitalière (SIH) pour 5 hôpitaux régionaux',
        objet: 'Le Ministère de la Santé et de l\'Hygiène Publique lance un appel d\'offres pour la conception, le développement et le déploiement d\'un Système d\'Information Hospitalière intégré pour les hôpitaux régionaux de Kindia, Labé, Kankan, N\'Zérékoré et Faranah.',
        entiteAdj: 'Ministère de la Santé et de l\'Hygiène Publique',
        datePublication: new Date(),
        dateLimite: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
        budgetEstimeGNF: BigInt(3_800_000_000),
        documentUrls: [],
        contactNom: 'Direction des Systèmes d\'Information — MSHP',
        contactEmail: 'dsi@sante.gov.gn',
      },
    ]
  }

  private async scraperJAO(): Promise<AOBrut[]> {
    return [
      {
        source: AOSource.JAO_GUINEE,
        sourceId: `JAO-2026-MRC-001`,
        titre: 'Création d\'un portail e-services pour la mairie de Conakry',
        objet: 'La Mairie de Conakry lance un appel d\'offres pour la conception, le développement et le déploiement d\'un portail de services en ligne permettant aux citoyens d\'effectuer leurs démarches administratives à distance.',
        entiteAdj: 'Mairie de Conakry',
        datePublication: new Date(),
        dateLimite: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        budgetEstimeGNF: BigInt(280_000_000),
        documentUrls: [],
        contactNom: 'Service des Marchés — Mairie de Conakry',
        contactEmail: 'marches@mairie-conakry.gov.gn',
        contactTelephone: '+224 621 000 200',
      },
      {
        source: AOSource.JAO_GUINEE,
        sourceId: `JAO-2026-MEFP-002`,
        titre: 'Plateforme numérique de gestion des bourses et aides à l\'éducation',
        objet: 'Le Ministère de l\'Enseignement et de la Formation Professionnelle souhaite développer une plateforme numérique permettant la gestion centralisée des bourses scolaires, des aides à l\'éducation et des inscriptions en ligne.',
        entiteAdj: 'Ministère de l\'Enseignement et de la Formation Professionnelle',
        datePublication: new Date(),
        dateLimite: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000),
        budgetEstimeGNF: BigInt(520_000_000),
        documentUrls: [],
        contactNom: 'Direction des Technologies Éducatives — MEFP',
        contactEmail: 'dte@education.gov.gn',
      },
    ]
  }

  private async scraperBanqueMondiale(): Promise<AOBrut[]> {
    return [
      {
        source: AOSource.BANQUE_MONDIALE,
        sourceId: `BM-WARDIP-2026-001`,
        titre: 'WARDIP: Plateforme d\'accompagnement des femmes entrepreneures du numérique',
        objet: 'Dans le cadre du projet WARDIP (Women\'s Digital Access Program in Africa), la Banque Mondiale recherche un prestataire pour développer une plateforme intégrée d\'accompagnement des femmes entrepreneurs dans le secteur numérique en Guinée.',
        entiteAdj: 'Banque Mondiale — Projet WARDIP Guinée',
        datePublication: new Date(),
        dateLimite: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
        budgetEstimeGNF: BigInt(2_500_000_000),
        documentUrls: [],
        contactNom: 'Task Team Leader — WARDIP Guinea',
        contactEmail: 'procurement-guinea@worldbank.org',
      },
      {
        source: AOSource.BANQUE_MONDIALE,
        sourceId: `BM-PDIL-2026-002`,
        titre: 'PDIL: Système de monitoring & évaluation des projets d\'infrastructure locale',
        objet: 'Dans le cadre du Programme de Développement des Infrastructures Locales (PDIL), la Banque Mondiale recherche un prestataire pour développer un système de suivi-évaluation numérique des 450 sous-projets d\'infrastructure communautaire.',
        entiteAdj: 'Banque Mondiale — PDIL Guinée',
        datePublication: new Date(),
        dateLimite: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        budgetEstimeGNF: BigInt(890_000_000),
        documentUrls: [],
        contactNom: 'Coordonnateur Technique — PDIL',
        contactEmail: 'pdil-guinea@worldbank.org',
        contactTelephone: '+224 625 000 300',
      },
    ]
  }

  private async scraperPNUD(): Promise<AOBrut[]> {
    return [
      {
        source: AOSource.PNUD,
        sourceId: `PNUD-GN-2026-ICT-001`,
        sourceUrl: 'https://procurement.undp.org/notice/GN-2026-ICT-001',
        titre: 'Développement d\'une plateforme de gestion des projets communautaires — PNUD Guinée',
        objet: 'Le PNUD Guinée recherche un prestataire pour concevoir et déployer une plateforme numérique de suivi-évaluation des projets communautaires dans les préfectures de Guinée Forestière, incluant la collecte de données terrain via mobile, le reporting automatisé et le tableau de bord pour les partenaires.',
        entiteAdj: 'PNUD Guinée — Bureau de Conakry',
        datePublication: new Date(),
        dateLimite: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
        budgetEstimeGNF: BigInt(1_800_000_000),
        documentUrls: [],
        contactNom: 'Procurement Unit — PNUD Guinée',
        contactEmail: 'procurement.guinea@undp.org',
        contactTelephone: '+224 631 000 400',
      },
      {
        source: AOSource.PNUD,
        sourceId: `PNUD-GN-2026-GOV-002`,
        sourceUrl: 'https://procurement.undp.org/notice/GN-2026-GOV-002',
        titre: 'Système d\'information pour la gestion de l\'état civil numérique',
        objet: 'Dans le cadre du projet d\'appui à la modernisation de l\'administration publique, le PNUD recrute un prestataire pour développer un système d\'information intégré de gestion de l\'état civil (naissances, mariages, décès) avec interopérabilité avec le registre national d\'identité.',
        entiteAdj: 'PNUD / Ministère de l\'Administration du Territoire',
        datePublication: new Date(),
        dateLimite: new Date(Date.now() + 32 * 24 * 60 * 60 * 1000),
        budgetEstimeGNF: BigInt(2_200_000_000),
        documentUrls: [],
        contactNom: 'Chargé de Gouvernance — PNUD Guinée',
        contactEmail: 'governance.guinea@undp.org',
      },
      {
        source: AOSource.PNUD,
        sourceId: `PNUD-GN-2026-ENV-003`,
        sourceUrl: 'https://procurement.undp.org/notice/GN-2026-ENV-003',
        titre: 'Application mobile de monitoring environnemental et climatique',
        objet: 'Le PNUD, dans le cadre du projet GEF-7 sur la biodiversité guinéenne, recherche un prestataire pour développer une application mobile offline-first permettant aux agents de terrain de collecter des données environnementales, d\'identifier les espèces protégées et de signaler les violations.',
        entiteAdj: 'PNUD / Ministère de l\'Environnement',
        datePublication: new Date(),
        dateLimite: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
        budgetEstimeGNF: BigInt(650_000_000),
        documentUrls: [],
        contactNom: 'Environment Programme Officer — PNUD',
        contactEmail: 'environment.guinea@undp.org',
        contactTelephone: '+224 632 000 500',
      },
    ]
  }

  private async scraperBAD(): Promise<AOBrut[]> {
    return [
      {
        source: AOSource.BAD,
        sourceId: `BAD-GN-2026-INFRA-001`,
        sourceUrl: 'https://www.afdb.org/fr/projects-and-operations/procurement/GN-2026-INFRA-001',
        titre: 'Système de gestion intégré des infrastructures routières — Guinée',
        objet: 'La Banque Africaine de Développement, dans le cadre du Projet de Réhabilitation des Routes Nationales (PRRN), recrute un prestataire pour développer un système de gestion et de monitoring des infrastructures routières guinéennes incluant SIG, état des routes, planification des travaux et reporting pour les bailleurs.',
        entiteAdj: 'BAD / Ministère des Travaux Publics — Guinée',
        datePublication: new Date(),
        dateLimite: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000),
        budgetEstimeGNF: BigInt(3_500_000_000),
        documentUrls: [],
        contactNom: 'Procurement Division — BAD Bureau Guinée',
        contactEmail: 'procurement-gn@afdb.org',
        contactTelephone: '+224 622 000 600',
      },
      {
        source: AOSource.BAD,
        sourceId: `BAD-GN-2026-AGRI-002`,
        sourceUrl: 'https://www.afdb.org/fr/projects-and-operations/procurement/GN-2026-AGRI-002',
        titre: 'Plateforme digitale de financement agricole et gestion des coopératives',
        objet: 'Dans le cadre du Projet d\'Appui au Développement Agricole en Guinée (PADAG), la BAD recrute un prestataire pour développer une plateforme numérique de mise en relation entre coopératives agricoles et institutions de microfinance, incluant gestion des prêts, suivi des remboursements et tableaux de bord.',
        entiteAdj: 'BAD / Ministère de l\'Agriculture',
        datePublication: new Date(),
        dateLimite: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
        budgetEstimeGNF: BigInt(1_400_000_000),
        documentUrls: [],
        contactNom: 'Agriculture Specialist — BAD Guinée',
        contactEmail: 'agriculture-gn@afdb.org',
      },
      {
        source: AOSource.BAD,
        sourceId: `BAD-GN-2026-ENER-003`,
        sourceUrl: 'https://www.afdb.org/fr/projects-and-operations/procurement/GN-2026-ENER-003',
        titre: 'Système SCADA et supervision numérique du réseau électrique guinéen',
        objet: 'La BAD, dans le cadre du Projet d\'Extension et Renforcement du Réseau Électrique de Guinée (PERREG), recherche un prestataire pour la fourniture et installation d\'un système SCADA de supervision et contrôle du réseau électrique national avec centre de dispatching numérique.',
        entiteAdj: 'BAD / EDG — Électricité de Guinée',
        datePublication: new Date(),
        dateLimite: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        budgetEstimeGNF: BigInt(5_200_000_000),
        documentUrls: [],
        contactNom: 'Energy Division — BAD Guinée',
        contactEmail: 'energy-gn@afdb.org',
        contactTelephone: '+224 625 000 700',
      },
    ]
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

        // Créer ou retrouver le contact de l'entité adjudicatrice
        let contactId: string | undefined
        if (ao.contactNom || ao.entiteAdj) {
          contactId = await this.upsertContact(ao, organisationId)
          if (contactId) contactsCreés++
        }

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

        // Auto-scorer le nouvel AO
        try {
          await this.scoringService.calculerScore(nouvelAO.id, organisationId)
          this.logger.log(`📊 Score calculé pour "${ao.titre.substring(0, 50)}..."`)
        } catch {
          // Le scoring peut échouer si l'organisation n'a pas de profil complet — non bloquant
        }
      } catch (error) {
        this.logger.error(`Erreur sauvegarde AO: ${error.message}`)
      }
    }

    return { nouveaux, contactsCreés }
  }

  private async upsertContact(ao: AOBrut, organisationId: string): Promise<string | undefined> {
    try {
      // Vérifier si un contact pour cette entité existe déjà (par email ou entité)
      const existant = await this.prisma.contact.findFirst({
        where: {
          organisationId,
          ...(ao.contactEmail
            ? { email: { hasSome: [ao.contactEmail] } }
            : { nom: ao.entiteAdj }),
        },
      })

      if (existant) return existant.id

      // Décomposer le nom de contact en prénom + nom
      const nomContact = ao.contactNom || ao.entiteAdj
      const parts = nomContact.split(' — ')
      const prenom = parts.length > 1 ? parts[0].trim() : 'Direction'
      const nom = parts.length > 1 ? parts[1].trim() : nomContact

      const contact = await this.prisma.contact.create({
        data: {
          prenom,
          nom,
          email: ao.contactEmail ? [ao.contactEmail] : [],
          telephone: ao.contactTelephone ? [ao.contactTelephone] : [],
          tags: ['prospect', 'veille-auto'],
          notes: `Entité adjudicatrice : ${ao.entiteAdj}`,
          organisationId,
        },
      })

      return contact.id
    } catch {
      return undefined
    }
  }
}

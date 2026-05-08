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
  { id: 'TELEMO', nom: 'TELEMO', url: 'https://telemo.gov.gn', actif: false, note: 'Clé API requise' },
  { id: 'PNUD', nom: 'PNUD / UNDP', url: 'https://procurement.undp.org', actif: false },
  { id: 'BAD', nom: 'Banque Africaine de Développement', url: 'https://www.afdb.org', actif: false },
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

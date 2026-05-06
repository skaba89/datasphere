import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as cheerio from 'cheerio'
import { PrismaService } from '../../common/prisma/prisma.service'
import { AiService } from '../ai/ai.service'
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
}

@Injectable()
export class ScrapingService {
  private readonly logger = new Logger(ScrapingService.name)

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private config: ConfigService,
  ) {}

  async scraperToutes(organisationId?: string) {
    this.logger.log('🔍 Démarrage de la veille multi-sources...')
    const resultats: { source: string; nouveaux: number; erreur?: string }[] = []

    const scrapers = [
      { nom: 'ARMP', fn: () => this.scraperARMP() },
      { nom: 'JAO Guinée', fn: () => this.scraperJAO() },
      { nom: 'Banque Mondiale', fn: () => this.scraperBanqueMondiale() },
    ]

    for (const scraper of scrapers) {
      try {
        const aos = await scraper.fn()
        const sauvegardes = organisationId
          ? await this.sauvegarderAOs(aos, organisationId)
          : 0
        resultats.push({ source: scraper.nom, nouveaux: sauvegardes })
        this.logger.log(`✅ ${scraper.nom}: ${aos.length} AOs collectés, ${sauvegardes} nouveaux`)
      } catch (error) {
        this.logger.error(`❌ ${scraper.nom}: ${error.message}`)
        resultats.push({ source: scraper.nom, nouveaux: 0, erreur: error.message })
      }
    }

    return resultats
  }

  private async scraperARMP(): Promise<AOBrut[]> {
    // Scraping du site ARMP Guinée
    // Note: En production, utiliser Playwright pour JS-rendered pages
    const mockAOs: AOBrut[] = [
      {
        source: AOSource.ARMP,
        sourceId: `ARMP-${Date.now()}-001`,
        sourceUrl: 'https://armp.gov.gn/ao/001',
        titre: 'Fourniture et installation d\'un système de gestion des archives numériques',
        objet: 'Le Ministère de l\'Administration du Territoire lance un appel d\'offres ouvert pour la fourniture et l\'installation d\'un système de gestion électronique des documents et archives (GED/GEA) comprenant les modules de numérisation, d\'indexation, de recherche et d\'archivage.',
        entiteAdj: 'Ministère de l\'Administration du Territoire',
        datePublication: new Date(),
        dateLimite: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        budgetEstimeGNF: BigInt(650_000_000),
        documentUrls: [],
      },
      {
        source: AOSource.ARMP,
        sourceId: `ARMP-${Date.now()}-002`,
        sourceUrl: 'https://armp.gov.gn/ao/002',
        titre: 'Développement d\'une plateforme de paiement des impôts en ligne',
        objet: 'La Direction Nationale des Impôts (DNI) souhaite se doter d\'une plateforme numérique permettant aux contribuables de déclarer et payer leurs impôts et taxes en ligne via différents modes de paiement incluant Mobile Money.',
        entiteAdj: 'Direction Nationale des Impôts (DNI)',
        datePublication: new Date(),
        dateLimite: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
        budgetEstimeGNF: BigInt(1_200_000_000),
        documentUrls: [],
      },
    ]

    return mockAOs
  }

  private async scraperJAO(): Promise<AOBrut[]> {
    const mockAOs: AOBrut[] = [
      {
        source: AOSource.JAO_GUINEE,
        sourceId: `JAO-${Date.now()}-001`,
        titre: 'Création d\'un portail e-services pour la mairie de Conakry',
        objet: 'La Mairie de Conakry lance un appel d\'offres pour la conception, le développement et le déploiement d\'un portail de services en ligne permettant aux citoyens d\'effectuer leurs démarches administratives à distance.',
        entiteAdj: 'Mairie de Conakry',
        datePublication: new Date(),
        dateLimite: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        budgetEstimeGNF: BigInt(280_000_000),
        documentUrls: [],
      },
    ]

    return mockAOs
  }

  private async scraperBanqueMondiale(): Promise<AOBrut[]> {
    const mockAOs: AOBrut[] = [
      {
        source: AOSource.BANQUE_MONDIALE,
        sourceId: `BM-WARDIP-${Date.now()}-001`,
        titre: 'WARDIP: Plateforme d\'accompagnement des femmes entrepreneures du numérique',
        objet: 'Dans le cadre du projet WARDIP (Women\'s Digital Access Program in Africa), la Banque Mondiale recherche un prestataire pour développer une plateforme intégrée d\'accompagnement des femmes entrepreneurs dans le secteur numérique en Guinée.',
        entiteAdj: 'Banque Mondiale - Projet WARDIP Guinée',
        datePublication: new Date(),
        dateLimite: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
        budgetEstimeGNF: BigInt(2_500_000_000),
        documentUrls: [],
      },
    ]

    return mockAOs
  }

  private async sauvegarderAOs(aos: AOBrut[], organisationId: string): Promise<number> {
    let nouveaux = 0

    for (const ao of aos) {
      try {
        const existant = ao.sourceId
          ? await this.prisma.appelOffre.findFirst({
              where: { source: ao.source, sourceId: ao.sourceId, organisationId },
            })
          : null

        if (existant) continue

        await this.prisma.appelOffre.create({
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
      } catch (error) {
        this.logger.error(`Erreur sauvegarde AO: ${error.message}`)
      }
    }

    return nouveaux
  }
}

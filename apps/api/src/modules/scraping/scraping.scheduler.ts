import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { ScrapingService } from './scraping.service'
import { PrismaService } from '../../common/prisma/prisma.service'

@Injectable()
export class ScrapingScheduler {
  private readonly logger = new Logger(ScrapingScheduler.name)

  constructor(
    private scrapingService: ScrapingService,
    private prisma: PrismaService,
  ) {}

  // Scraping toutes les 2 heures
  @Cron('0 */2 * * *')
  async scraperToutesOrganisations() {
    this.logger.log('⏰ Cron: démarrage scraping automatique')

    const organisations = await this.prisma.organisation.findMany({
      where: {
        planStatus: 'ACTIVE',
        plan: { in: ['PRO', 'ENTERPRISE'] },
      },
      select: { id: true, nom: true },
    })

    for (const org of organisations) {
      try {
        await this.scrapingService.scraperToutes(org.id)
        this.logger.log(`✅ Scraping OK pour ${org.nom}`)
      } catch (err) {
        this.logger.error(`❌ Scraping échoué pour ${org.nom}: ${err.message}`)
      }
    }
  }

  // Alertes deadlines: tous les jours à 7h (heure de Conakry UTC+0)
  @Cron('0 7 * * *')
  async alertesDeadlines() {
    this.logger.log('⏰ Cron: vérification des deadlines')

    const dans48h = new Date(Date.now() + 48 * 60 * 60 * 1000)
    const dans7j = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const aosUrgents = await this.prisma.appelOffre.findMany({
      where: {
        status: { in: ['QUALIFIE', 'EN_COURS'] },
        dateLimite: { lte: dans48h, gte: new Date() },
      },
      select: { id: true, titre: true, dateLimite: true, organisationId: true },
    })

    for (const ao of aosUrgents) {
      const heuresRestantes = Math.floor((ao.dateLimite.getTime() - Date.now()) / (1000 * 60 * 60))
      await this.prisma.alerte.create({
        data: {
          titre: '⚠️ Deadline dans moins de 48h',
          message: `L'AO "${ao.titre}" expire dans ${heuresRestantes}h. Vérifiez que votre dossier est prêt à soumettre.`,
          type: 'DEADLINE_URGENTE',
          aoId: ao.id,
        },
      })
    }

    this.logger.log(`📢 ${aosUrgents.length} alertes deadline créées`)
  }
}

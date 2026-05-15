import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'

@Injectable()
export class OrganisationsService {
  constructor(private prisma: PrismaService) {}

  async findOne(id: string) {
    const org = await this.prisma.organisation.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            appelsOffres: true,
            contacts: true,
            dossiers: true,
            references: true,
          },
        },
      },
    })
    if (!org) throw new NotFoundException('Organisation introuvable')
    return org
  }

  async update(id: string, data: any) {
    // Exclure les champs protégés — empêche la modification de plan, planStatus, planExpiresAt
    const protectedFields = ['plan', 'planStatus', 'planExpiresAt', 'trialEndsAt', 'scoringConfig', 'aiConfig']
    const filteredData = { ...data }
    for (const field of protectedFields) {
      delete filteredData[field]
    }

    let settingsData: any = undefined
    if (filteredData.settings !== undefined) {
      const current = await this.prisma.organisation.findUnique({ where: { id }, select: { settings: true } })
      settingsData = { ...((current?.settings as object) ?? {}), ...filteredData.settings }
    }
    const { settings, ...rest } = filteredData
    return this.prisma.organisation.update({
      where: { id },
      data: {
        ...rest,
        ...(rest.caAnnuelGNF && { caAnnuelGNF: BigInt(rest.caAnnuelGNF) }),
        ...(settingsData !== undefined && { settings: settingsData }),
      },
    })
  }

  async updateScoringConfig(id: string, config: any) {
    return this.prisma.organisation.update({
      where: { id },
      data: { scoringConfig: config },
    })
  }

  async getReferences(id: string) {
    return this.prisma.reference.findMany({
      where: { organisationId: id },
      orderBy: { dateDebut: 'desc' },
    })
  }

  async createReference(organisationId: string, data: any) {
    return this.prisma.reference.create({
      data: {
        ...data,
        dateDebut: new Date(data.dateDebut),
        dateFin: data.dateFin ? new Date(data.dateFin) : undefined,
        montantGNF: data.montantGNF ? BigInt(data.montantGNF) : undefined,
        organisationId,
      },
    })
  }

  async getExperts(id: string) {
    return this.prisma.expert.findMany({
      where: { organisationId: id },
      orderBy: { nom: 'asc' },
    })
  }

  async createExpert(organisationId: string, data: any) {
    return this.prisma.expert.create({
      data: { ...data, organisationId },
    })
  }

  async getDashboard(organisationId: string) {
    const [aoStats, contactStats, dossierStats, recentAOs] = await Promise.all([
      this.prisma.appelOffre.groupBy({
        by: ['status'],
        where: { organisationId },
        _count: { status: true },
      }),
      this.prisma.contact.count({ where: { organisationId } }),
      this.prisma.dossier.groupBy({
        by: ['status'],
        where: { organisationId },
        _count: { status: true },
      }),
      this.prisma.appelOffre.findMany({
        where: {
          organisationId,
          status: { in: ['NOUVEAU', 'QUALIFIE', 'EN_COURS'] },
          dateLimite: { gte: new Date() },
        },
        orderBy: { dateLimite: 'asc' },
        take: 5,
        select: { id: true, titre: true, dateLimite: true, status: true, score: true, entiteAdj: true },
      }),
    ])

    return {
      appelsOffres: aoStats.reduce((acc, s) => ({ ...acc, [s.status]: s._count.status }), {}),
      contacts: contactStats,
      dossiers: dossierStats.reduce((acc, s) => ({ ...acc, [s.status]: s._count.status }), {}),
      prochainDeadlines: recentAOs,
    }
  }
}

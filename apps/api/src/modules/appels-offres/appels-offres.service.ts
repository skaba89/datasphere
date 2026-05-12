import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { CreateAODto } from './dto/create-ao.dto'
import { UpdateAODto } from './dto/update-ao.dto'
import { QueryAODto } from './dto/query-ao.dto'
import { AOStatus, Prisma } from '@guineatender/database'

@Injectable()
export class AppelsOffresService {
  constructor(private prisma: PrismaService) {}

  async findAll(organisationId: string, query: QueryAODto) {
    const where: Prisma.AppelOffreWhereInput = {
      organisationId,
      ...(query.status && { status: query.status as AOStatus }),
      ...(query.secteur && { secteur: query.secteur as any }),
      ...(query.source && { source: query.source as any }),
      ...(query.search && {
        OR: [
          { titre: { contains: query.search, mode: 'insensitive' } },
          { objet: { contains: query.search, mode: 'insensitive' } },
          { entiteAdj: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
      ...(query.scoreMin && { score: { gte: query.scoreMin } }),
      ...(query.dateLimit && { dateLimite: { gte: new Date(query.dateLimit) } }),
    }

    const [total, items] = await Promise.all([
      this.prisma.appelOffre.count({ where }),
      this.prisma.appelOffre.findMany({
        where,
        include: {
          assignes: { select: { id: true, prenom: true, nom: true, avatarUrl: true } },
          _count: { select: { dossiers: true } },
        },
        orderBy: query.sort === 'score' ? { score: 'desc' } : { dateLimite: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ])

    return {
      data: items,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    }
  }

  async findOne(id: string, organisationId: string) {
    const ao = await this.prisma.appelOffre.findFirst({
      where: { id, organisationId },
      include: {
        assignes: { select: { id: true, prenom: true, nom: true, avatarUrl: true, email: true } },
        dossiers: {
          select: { id: true, titre: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
        alertes: { where: { lue: false }, take: 5 },
      },
    })

    if (!ao) throw new NotFoundException('Appel d\'offres introuvable')
    return ao
  }

  async create(organisationId: string, createdById: string, dto: CreateAODto) {
    return this.prisma.appelOffre.create({
      data: {
        ...dto,
        organisationId,
        datePublication: new Date(dto.datePublication),
        dateLimite: new Date(dto.dateLimite),
        budgetEstimeGNF: dto.budgetEstimeGNF ? BigInt(dto.budgetEstimeGNF) : undefined,
      },
    })
  }

  async update(id: string, organisationId: string, dto: UpdateAODto) {
    await this.findOne(id, organisationId)
    return this.prisma.appelOffre.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.dateLimite && { dateLimite: new Date(dto.dateLimite) }),
        ...(dto.budgetEstimeGNF && { budgetEstimeGNF: BigInt(dto.budgetEstimeGNF) }),
      },
    })
  }

  async updateStatus(id: string, organisationId: string, status: AOStatus, motif?: string) {
    await this.findOne(id, organisationId)
    return this.prisma.appelOffre.update({
      where: { id },
      data: {
        status,
        ...(motif && { decisionMotif: motif }),
        decisionDate: new Date(),
      },
    })
  }

  async assignUser(aoId: string, organisationId: string, userId: string) {
    await this.findOne(aoId, organisationId)
    return this.prisma.appelOffre.update({
      where: { id: aoId },
      data: { assignes: { connect: { id: userId } } },
    })
  }

  async getStats(organisationId: string) {
    const [totalAOs, parStatus, budgetTotal, expirantBientot, scored, goCount, maybeCount, noGoCount, dossiersGeneres, budgetValeurTotale] = await Promise.all([
      this.prisma.appelOffre.count({ where: { organisationId } }),
      this.prisma.appelOffre.groupBy({
        by: ['status'],
        where: { organisationId },
        _count: { status: true },
      }),
      this.prisma.appelOffre.aggregate({
        where: { organisationId, status: 'REMPORTE' },
        _sum: { budgetEstimeGNF: true },
      }),
      this.prisma.appelOffre.count({
        where: {
          organisationId,
          status: { in: ['QUALIFIE', 'EN_COURS'] },
          dateLimite: {
            gte: new Date(),
            lte: new Date(Date.now() + 48 * 60 * 60 * 1000),
          },
        },
      }),
      this.prisma.appelOffre.aggregate({
        where: { organisationId, score: { not: null } },
        _avg: { score: true },
        _count: { score: true },
      }),
      this.prisma.appelOffre.count({ where: { organisationId, score: { gte: 65 } } }),
      this.prisma.appelOffre.count({ where: { organisationId, score: { gte: 50, lt: 65 } } }),
      this.prisma.appelOffre.count({ where: { organisationId, score: { lt: 50, not: null } } }),
      this.prisma.dossier.count({ where: { organisationId, generatedByAI: true } }),
      this.prisma.appelOffre.aggregate({
        where: { organisationId },
        _sum: { budgetEstimeGNF: true },
      }),
    ])

    const statusMap = parStatus.reduce((acc: Record<string, number>, s) => ({ ...acc, [s.status]: s._count.status }), {})
    const remporte = statusMap['REMPORTE'] ?? 0
    const soumis = statusMap['SOUMIS'] ?? 0
    const tauxSucces = soumis + remporte > 0 ? Math.round((remporte / (soumis + remporte)) * 100) : 0

    return {
      total: totalAOs,
      parStatus: statusMap,
      budgetRemporte: budgetTotal._sum.budgetEstimeGNF?.toString() ?? '0',
      expirantBientot,
      scoreMoyen: scored._avg.score ? Math.round(scored._avg.score) : null,
      goCount,
      maybeCount,
      noGoCount,
      tauxSucces,
      dossiersGeneres,
      valeurTotale: budgetValeurTotale._sum.budgetEstimeGNF?.toString() ?? '0',
    }
  }

  async getPipeline(organisationId: string) {
    const statuts = ['QUALIFIE', 'EN_COURS', 'SOUMIS', 'REMPORTE', 'PERDU']

    const pipeline = await Promise.all(
      statuts.map(async (status) => {
        const items = await this.prisma.appelOffre.findMany({
          where: { organisationId, status: status as AOStatus },
          select: {
            id: true,
            titre: true,
            entiteAdj: true,
            score: true,
            dateLimite: true,
            budgetEstimeGNF: true,
            secteur: true,
          },
          orderBy: { dateLimite: 'asc' },
        })
        return { status, items, count: items.length }
      }),
    )

    return pipeline
  }

  async getTendanceMensuelle(organisationId: string) {
    const now = new Date()
    const mois = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
      return { year: d.getFullYear(), month: d.getMonth() + 1, label: d.toLocaleString('fr-FR', { month: 'short' }) }
    })

    const results = await Promise.all(
      mois.map(async ({ year, month, label }) => {
        const debut = new Date(year, month - 1, 1)
        const fin = new Date(year, month, 0, 23, 59, 59)
        const [aos, dossiers, gagnes] = await Promise.all([
          this.prisma.appelOffre.count({ where: { organisationId, createdAt: { gte: debut, lte: fin } } }),
          this.prisma.dossier.count({ where: { organisationId, createdAt: { gte: debut, lte: fin } } }),
          this.prisma.appelOffre.count({ where: { organisationId, status: 'REMPORTE', decisionDate: { gte: debut, lte: fin } } }),
        ])
        return { mois: label, aos, dossiers, gagnes }
      }),
    )

    return results
  }

  async getParSecteur(organisationId: string) {
    const groups = await this.prisma.appelOffre.groupBy({
      by: ['secteur'],
      where: { organisationId, secteur: { not: null } },
      _sum: { budgetEstimeGNF: true },
      _count: { secteur: true },
      orderBy: { _sum: { budgetEstimeGNF: 'desc' } },
      take: 8,
    })

    return groups.map(g => ({
      secteur: g.secteur ?? 'Autre',
      valeur: Number(g._sum.budgetEstimeGNF ?? 0),
      count: g._count.secteur,
    }))
  }

  async getParSource(organisationId: string) {
    const sources = await this.prisma.appelOffre.groupBy({
      by: ['source'],
      where: { organisationId },
      _count: { source: true },
    })

    const results = await Promise.all(
      sources.map(async (s) => {
        const [soumis, gagnes] = await Promise.all([
          this.prisma.appelOffre.count({
            where: { organisationId, source: s.source, status: { in: ['SOUMIS', 'REMPORTE'] } },
          }),
          this.prisma.appelOffre.count({
            where: { organisationId, source: s.source, status: 'REMPORTE' },
          }),
        ])
        const total = soumis + gagnes > 0 ? soumis : 0
        return {
          source: s.source,
          detectes: s._count.source,
          soumis: soumis - gagnes,
          gagnes,
          taux: soumis > 0 ? Math.round((gagnes / soumis) * 100) : 0,
        }
      }),
    )

    return results.sort((a, b) => b.detectes - a.detectes)
  }

  async getActiviteRecente(organisationId: string) {
    const [recentAOs, recentDossiers, recentStatusChanges] = await Promise.all([
      this.prisma.appelOffre.findMany({
        where: { organisationId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, titre: true, source: true, createdAt: true, status: true },
      }),
      this.prisma.dossier.findMany({
        where: { organisationId },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: { id: true, titre: true, status: true, updatedAt: true },
      }),
      this.prisma.appelOffre.findMany({
        where: { organisationId, decisionDate: { not: null } },
        orderBy: { decisionDate: 'desc' },
        take: 5,
        select: { id: true, titre: true, status: true, decisionDate: true },
      }),
    ])

    const activites = [
      ...recentAOs.map(ao => ({
        id: `ao-new-${ao.id}`,
        type: 'ao_nouveau' as const,
        titre: ao.titre,
        detail: `Détecté via ${ao.source}`,
        date: ao.createdAt,
        href: `/appels-offres/${ao.id}`,
      })),
      ...recentDossiers.map(d => ({
        id: `dossier-${d.id}`,
        type: 'dossier_update' as const,
        titre: d.titre,
        detail: `Statut : ${d.status}`,
        date: d.updatedAt,
        href: `/dossiers/${d.id}`,
      })),
      ...recentStatusChanges.map(ao => ({
        id: `ao-status-${ao.id}`,
        type: 'ao_status' as const,
        titre: ao.titre,
        detail: `Statut mis à jour : ${ao.status}`,
        date: ao.decisionDate!,
        href: `/appels-offres/${ao.id}`,
      })),
    ]

    return activites
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)
  }

  async delete(id: string, organisationId: string) {
    await this.findOne(id, organisationId)
    return this.prisma.appelOffre.delete({ where: { id } })
  }
}

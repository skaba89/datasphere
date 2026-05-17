import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { SolutionCategory } from '@guineatender/database'

@Injectable()
export class SolutionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: { categorie?: string; search?: string; page?: number; limit?: number }) {
    const page = Number(query.page) || 1
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20))

    const where = {
      isActive: true,
      ...(query.categorie && { categorie: query.categorie as SolutionCategory }),
      ...(query.search && {
        OR: [
          { nom: { contains: query.search, mode: 'insensitive' as const } },
          { description: { contains: query.search, mode: 'insensitive' as const } },
        ],
      }),
    }

    const [total, items] = await Promise.all([
      this.prisma.solution.count({ where }),
      this.prisma.solution.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    return { data: items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } }
  }

  async findOne(id: string) {
    const solution = await this.prisma.solution.findUnique({ where: { id } })
    if (!solution) throw new NotFoundException('Solution introuvable')
    return solution
  }

  async estimer(id: string, config: Record<string, any>) {
    const solution = await this.findOne(id)
    const baseMin = Number(solution.estimCoutMin || 0)
    const baseMax = Number(solution.estimCoutMax || 0)

    const nbUtilisateurs = config.nbUtilisateurs ?? 500
    const nbAgences = config.nbAgences ?? 1
    const dureeAnsMaintenance = config.dureeAnsMaintenance ?? 1
    const hebergementCloud = config.hebergementCloud ?? true
    const formationIncluse = config.formationIncluse ?? true

    // Facteurs d'ajustement
    const facteurUtilisateurs = nbUtilisateurs > 2000 ? 1.5 : nbUtilisateurs > 500 ? 1.2 : 1
    const facteurAgences = 1 + (nbAgences - 1) * 0.08
    const facteurMaintenance = 1 + dureeAnsMaintenance * 0.15
    const facteurCloud = hebergementCloud ? 1.1 : 1
    const facteurFormation = formationIncluse ? 1.08 : 1

    const multiplicateur = facteurUtilisateurs * facteurAgences * facteurMaintenance * facteurCloud * facteurFormation

    const coutMin = Math.round(baseMin * multiplicateur)
    const coutMax = Math.round(baseMax * multiplicateur)
    const delaiMois = solution.estimDelaiMois
      ? Math.ceil(solution.estimDelaiMois * (nbAgences > 3 ? 1.2 : 1))
      : null

    return {
      coutMin,
      coutMax,
      delaiMois,
      details: {
        'Base solution': `${(baseMin / 1_000_000).toFixed(0)}M – ${(baseMax / 1_000_000).toFixed(0)}M GNF`,
        'Utilisateurs (×)': facteurUtilisateurs.toFixed(2),
        'Sites / agences (×)': facteurAgences.toFixed(2),
        'Maintenance (×)': facteurMaintenance.toFixed(2),
        'Hébergement cloud (×)': facteurCloud.toFixed(2),
        'Formation (×)': facteurFormation.toFixed(2),
        'Multiplicateur total': multiplicateur.toFixed(2),
      },
    }
  }

  async genererDescription(id: string, config: Record<string, any>): Promise<string> {
    const solution = await this.findOne(id)
    return `${solution.nom} — Solution complète de ${solution.description.substring(0, 200)}...\n\nStack technique: ${solution.techStack.join(', ')}\n\nConfiguration choisie: ${JSON.stringify(config, null, 2)}`
  }
}

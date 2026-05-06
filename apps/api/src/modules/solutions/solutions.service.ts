import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { SolutionCategory } from '@guineatender/database'

@Injectable()
export class SolutionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: { categorie?: string; search?: string; page?: number; limit?: number }) {
    const page = query.page ?? 1
    const limit = query.limit ?? 20

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

    const multiplicateurs: Record<string, number> = {
      volumeDocuments: config.volumeDocuments > 1000000 ? 1.5 : 1,
      multilingue: config.multilingue ? 1.2 : 1,
      integrations: (config.integrations?.length || 0) * 0.1 + 1,
      securiteElevee: config.securiteElevee ? 1.15 : 1,
    }

    const multiplicateurTotal = Object.values(multiplicateurs).reduce((a, b) => a * b, 1)

    return {
      solution: { id: solution.id, nom: solution.nom },
      estimation: {
        minGNF: Math.round(baseMin * multiplicateurTotal),
        maxGNF: Math.round(baseMax * multiplicateurTotal),
        delaiMois: solution.estimDelaiMois,
        config,
        multiplicateurs,
      },
    }
  }

  async genererDescription(id: string, config: Record<string, any>): Promise<string> {
    const solution = await this.findOne(id)
    return `${solution.nom} — Solution complète de ${solution.description.substring(0, 200)}...\n\nStack technique: ${solution.techStack.join(', ')}\n\nConfiguration choisie: ${JSON.stringify(config, null, 2)}`
  }
}

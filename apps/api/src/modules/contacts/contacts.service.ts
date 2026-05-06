import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { Prisma } from '@guineatender/database'

@Injectable()
export class ContactsService {
  constructor(private prisma: PrismaService) {}

  async findAll(organisationId: string, query: { search?: string; entiteId?: string; page?: number; limit?: number }) {
    const page = query.page ?? 1
    const limit = query.limit ?? 20
    const where: Prisma.ContactWhereInput = {
      organisationId,
      ...(query.entiteId && { entiteId: query.entiteId }),
      ...(query.search && {
        OR: [
          { prenom: { contains: query.search, mode: 'insensitive' } },
          { nom: { contains: query.search, mode: 'insensitive' } },
          { poste: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    }

    const [total, items] = await Promise.all([
      this.prisma.contact.count({ where }),
      this.prisma.contact.findMany({
        where,
        include: {
          entite: { select: { id: true, nom: true, type: true } },
          _count: { select: { interactions: true } },
        },
        orderBy: [{ scoreProximite: 'desc' }, { nom: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    return { data: items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } }
  }

  async findOne(id: string, organisationId: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, organisationId },
      include: {
        entite: true,
        interactions: {
          orderBy: { date: 'desc' },
          take: 10,
          include: { ao: { select: { id: true, titre: true } } },
        },
      },
    })
    if (!contact) throw new NotFoundException('Contact introuvable')
    return contact
  }

  async create(organisationId: string, data: any) {
    return this.prisma.contact.create({
      data: { ...data, organisationId },
    })
  }

  async update(id: string, organisationId: string, data: any) {
    await this.findOne(id, organisationId)
    return this.prisma.contact.update({ where: { id }, data })
  }

  async addInteraction(contactId: string, organisationId: string, userId: string, data: any) {
    await this.findOne(contactId, organisationId)

    const interaction = await this.prisma.interaction.create({
      data: { ...data, contactId, userId, date: new Date(data.date) },
    })

    // Recalculer le score de proximité
    await this.updateScoreProximite(contactId)

    return interaction
  }

  private async updateScoreProximite(contactId: string) {
    const interactions = await this.prisma.interaction.findMany({
      where: { contactId },
      orderBy: { date: 'desc' },
      take: 20,
    })

    if (interactions.length === 0) {
      await this.prisma.contact.update({ where: { id: contactId }, data: { scoreProximite: 0 } })
      return
    }

    const maintenant = Date.now()
    let score = 0

    for (const interaction of interactions) {
      const joursEcoules = (maintenant - interaction.date.getTime()) / (1000 * 60 * 60 * 24)
      const poids = joursEcoules <= 30 ? 10 : joursEcoules <= 90 ? 5 : 2
      const typeBonus = interaction.type === 'REUNION' ? 2 : interaction.type === 'APPEL_TELEPHONIQUE' ? 1.5 : 1
      score += poids * typeBonus
    }

    const scoreNormalise = Math.min(100, Math.round(score))
    await this.prisma.contact.update({
      where: { id: contactId },
      data: { scoreProximite: scoreNormalise, derniereInteraction: interactions[0].date },
    })
  }

  async getStats(organisationId: string) {
    const [total, chauds, tiedes, froids] = await Promise.all([
      this.prisma.contact.count({ where: { organisationId } }),
      this.prisma.contact.count({ where: { organisationId, scoreProximite: { gte: 70 } } }),
      this.prisma.contact.count({ where: { organisationId, scoreProximite: { gte: 30, lt: 70 } } }),
      this.prisma.contact.count({ where: { organisationId, scoreProximite: { lt: 30 } } }),
    ])

    return { total, chauds, tiedes, froids }
  }

  async delete(id: string, organisationId: string) {
    await this.findOne(id, organisationId)
    return this.prisma.contact.delete({ where: { id } })
  }
}

import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { Prisma } from '@guineatender/database'

async function fetchSafe(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 10_000)
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'GuineaTenderBot/1.0', 'Accept': 'text/html' },
    })
    clearTimeout(timer)
    return res.ok ? res.text() : null
  } catch { return null }
}

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name)

  constructor(private prisma: PrismaService) {}

  async findAll(organisationId: string, query: { search?: string; entiteId?: string; tag?: string; page?: number; limit?: number }) {
    const page = query.page ?? 1
    const limit = query.limit ?? 20
    const where: Prisma.ContactWhereInput = {
      organisationId,
      ...(query.entiteId && { entiteId: query.entiteId }),
      ...(query.tag && { tags: { has: query.tag } }),
      ...(query.search && {
        OR: [
          { prenom: { contains: query.search, mode: 'insensitive' } },
          { nom: { contains: query.search, mode: 'insensitive' } },
          { poste: { contains: query.search, mode: 'insensitive' } },
          { notes: { contains: query.search, mode: 'insensitive' } },
          { tags: { has: query.search.toLowerCase() } },
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

    // Normalise les champs frontend (description/resultat) vers le schéma Prisma
    const { description, resultat, date, ...rest } = data
    const interaction = await this.prisma.interaction.create({
      data: {
        ...rest,
        contactId,
        userId,
        date: date ? new Date(date) : new Date(),
        objet: rest.objet ?? description ?? '',
        suivi: rest.suivi ?? resultat,
      },
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

  async enrichir(id: string, organisationId: string) {
    const contact = await this.findOne(id, organisationId)

    // Extraire l'URL source depuis les notes
    const sourceMatch = contact.notes?.match(/Source\s*:\s*(https?:\/\/\S+)/)
    const sourceUrl = sourceMatch?.[1]

    if (!sourceUrl) return { enrichi: false, message: 'Aucune URL source trouvée dans les notes' }

    const html = await fetchSafe(sourceUrl)
    if (!html) return { enrichi: false, message: 'Page source inaccessible' }

    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

    const emailMatches = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) ?? []
    const email = emailMatches.find(e =>
      !e.includes('noreply') && !e.includes('example') && !e.includes('test@') &&
      !e.includes('webmaster') && e.length < 80
    )

    const telMatches = text.match(/(\+224[\s.\-]?[\d\s.\-]{8,14}|6[2-8]\d[\s.\-]?\d{2,3}[\s.\-]?\d{2,3}[\s.\-]?\d{2,3})/g) ?? []
    const telephone = telMatches.find(t => t.replace(/\D/g, '').length >= 8)

    const adresseMatch = text.match(/((?:BP|Boîte\s+postale)\s*\d+|(?:Avenue|Rue|Boulevard|Quartier|Commune)[^,\n]{5,60})/i)
    const adresse = adresseMatch?.[0]?.trim()

    const updates: any = { enrichiAuto: true, enrichiAt: new Date() }

    if (email && !contact.email.includes(email))
      updates.email = [...contact.email, email]
    if (telephone && !contact.telephone.includes(telephone))
      updates.telephone = [...contact.telephone, telephone]
    if (adresse && !contact.notes?.includes(adresse))
      updates.notes = `${contact.notes ?? ''}\nAdresse : ${adresse}`.trim()

    if (Object.keys(updates).length > 2) {
      await this.prisma.contact.update({ where: { id }, data: updates })
      this.logger.log(`Contact ${id} enrichi depuis ${sourceUrl}`)
      return { enrichi: true, email, telephone, adresse }
    }

    await this.prisma.contact.update({ where: { id }, data: { enrichiAuto: true, enrichiAt: new Date() } })
    return { enrichi: false, message: 'Aucune nouvelle information trouvée' }
  }
}

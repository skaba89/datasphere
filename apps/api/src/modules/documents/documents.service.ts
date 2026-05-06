import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { DocumentType } from '@guineatender/database'

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(organisationId: string) {
    const documents = await this.prisma.orgDocument.findMany({
      where: { organisationId },
      orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
    })

    const maintenant = new Date()
    const dans30j = new Date(maintenant.getTime() + 30 * 24 * 60 * 60 * 1000)

    return documents.map((doc) => ({
      ...doc,
      statut: !doc.dateExpiration
        ? 'VALIDE'
        : doc.dateExpiration < maintenant
        ? 'EXPIRE'
        : doc.dateExpiration < dans30j
        ? 'EXPIRE_BIENTOT'
        : 'VALIDE',
    }))
  }

  async create(organisationId: string, data: any) {
    return this.prisma.orgDocument.create({
      data: {
        ...data,
        dateEmission: data.dateEmission ? new Date(data.dateEmission) : undefined,
        dateExpiration: data.dateExpiration ? new Date(data.dateExpiration) : undefined,
        organisationId,
      },
    })
  }

  async update(id: string, organisationId: string, data: any) {
    return this.prisma.orgDocument.update({
      where: { id },
      data: {
        ...data,
        dateExpiration: data.dateExpiration ? new Date(data.dateExpiration) : undefined,
      },
    })
  }

  async delete(id: string) {
    return this.prisma.orgDocument.delete({ where: { id } })
  }

  async getAlertes(organisationId: string) {
    const dans30j = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    return this.prisma.orgDocument.findMany({
      where: {
        organisationId,
        dateExpiration: { lte: dans30j },
      },
      orderBy: { dateExpiration: 'asc' },
    })
  }
}

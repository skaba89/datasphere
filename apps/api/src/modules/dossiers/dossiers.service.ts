import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { AiService } from '../ai/ai.service'
import { DossierStatus } from '@guineatender/database'

@Injectable()
export class DossiersService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
  ) {}

  async findAll(organisationId: string, query: { aoId?: string; status?: string; page?: number; limit?: number }) {
    const page = query.page ?? 1
    const limit = query.limit ?? 20
    const where = {
      organisationId,
      ...(query.aoId && { aoId: query.aoId }),
      ...(query.status && { status: query.status as DossierStatus }),
    }

    const [total, items] = await Promise.all([
      this.prisma.dossier.count({ where }),
      this.prisma.dossier.findMany({
        where,
        include: {
          ao: { select: { id: true, titre: true, dateLimite: true, entiteAdj: true } },
          createdBy: { select: { id: true, prenom: true, nom: true } },
          _count: { select: { collaborateurs: true, versions: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    return { data: items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } }
  }

  async findOne(id: string, organisationId: string) {
    const dossier = await this.prisma.dossier.findFirst({
      where: { id, organisationId },
      include: {
        ao: true,
        solution: true,
        createdBy: { select: { id: true, prenom: true, nom: true } },
        collaborateurs: { include: { user: { select: { id: true, prenom: true, nom: true, email: true } } } },
        versions: { orderBy: { numero: 'desc' }, take: 5 },
      },
    })
    if (!dossier) throw new NotFoundException('Dossier introuvable')
    return dossier
  }

  async create(organisationId: string, createdById: string, data: { aoId: string; titre: string; solutionId?: string }) {
    const ao = await this.prisma.appelOffre.findFirst({
      where: { id: data.aoId, organisationId },
    })
    if (!ao) throw new NotFoundException('AO introuvable')

    const dossier = await this.prisma.dossier.create({
      data: {
        titre: data.titre || `Dossier — ${ao.titre}`,
        aoId: data.aoId,
        organisationId,
        createdById,
        solutionId: data.solutionId,
      },
    })

    // Mettre à jour le statut de l'AO
    await this.prisma.appelOffre.update({
      where: { id: data.aoId },
      data: { status: 'EN_COURS' },
    })

    return dossier
  }

  async update(id: string, organisationId: string, data: any) {
    const dossier = await this.findOne(id, organisationId)

    // Sauvegarder une version avant modification
    if (dossier.memTechnique || dossier.offreFinanciere) {
      await this.prisma.dossierVersion.create({
        data: {
          dossierId: id,
          numero: dossier.version,
          snapshot: {
            memTechnique: dossier.memTechnique,
            offreFinanciere: dossier.offreFinanciere,
            planning: dossier.planning,
          },
        },
      })
    }

    return this.prisma.dossier.update({
      where: { id },
      data: { ...data, version: { increment: 1 } },
    })
  }

  async genererAvecIA(id: string, organisationId: string) {
    const dossier = await this.findOne(id, organisationId)

    // Génération parallèle du mémoire et de l'offre financière
    const [memTechnique, offreFinanciere] = await Promise.all([
      this.aiService.genererMemTechnique(dossier.aoId, organisationId, {
        solutionId: dossier.solutionId ?? undefined,
      }),
      this.aiService.genererOffreFinanciere(dossier.aoId, organisationId, {}),
    ])

    return this.prisma.dossier.update({
      where: { id },
      data: {
        memTechnique: { content: memTechnique } as any,
        offreFinanciere: offreFinanciere as any,
        generatedByAI: true,
        version: { increment: 1 },
      },
    })
  }

  async soumettre(id: string, organisationId: string, reference?: string) {
    await this.findOne(id, organisationId)
    const dossier = await this.prisma.dossier.update({
      where: { id },
      data: {
        status: 'SOUMIS',
        soumisAt: new Date(),
        referenceSoumission: reference,
      },
      include: { ao: true },
    })

    await this.prisma.appelOffre.update({
      where: { id: dossier.aoId },
      data: { status: 'SOUMIS' },
    })

    return dossier
  }

  async addCollaborateur(id: string, organisationId: string, userId: string) {
    await this.findOne(id, organisationId)
    return this.prisma.dossierCollab.upsert({
      where: { dossierId_userId: { dossierId: id, userId } },
      update: {},
      create: { dossierId: id, userId },
    })
  }

  async getChecklist(id: string, organisationId: string) {
    const dossier = await this.findOne(id, organisationId)
    const ao = dossier.ao as any

    const piecesStandard = [
      { code: 'RCCM', nom: 'Registre de Commerce (RCCM)', obligatoire: true },
      { code: 'IFU', nom: 'Identifiant Fiscal Unique (IFU)', obligatoire: true },
      { code: 'ATT_FISCALE', nom: 'Attestation de régularité fiscale', obligatoire: true },
      { code: 'ATT_CNSS', nom: 'Attestation CNSS', obligatoire: true },
      { code: 'STATUTS', nom: 'Statuts de la société', obligatoire: true },
      { code: 'BILAN', nom: 'Bilans des 3 dernières années', obligatoire: false },
      { code: 'REFERENCES', nom: 'Références techniques similaires', obligatoire: true },
      { code: 'CV_EXPERTS', nom: 'CV des experts clés', obligatoire: true },
      { code: 'CAUTION', nom: 'Caution de soumission', obligatoire: true },
      { code: 'POUVOIR', nom: 'Pouvoir du signataire', obligatoire: false },
    ]

    const orgDocs = await this.prisma.orgDocument.findMany({
      where: { organisationId },
    })

    return piecesStandard.map((piece) => {
      const docTrouve = orgDocs.find((d) => d.type.includes(piece.code))
      const expire = docTrouve?.dateExpiration && docTrouve.dateExpiration < new Date()
      return {
        ...piece,
        statut: docTrouve ? (expire ? 'EXPIRE' : 'FOURNIE') : 'MANQUANTE',
        dateExpiration: docTrouve?.dateExpiration,
        fileUrl: docTrouve?.fileUrl,
      }
    })
  }
}

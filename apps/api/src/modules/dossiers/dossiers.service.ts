import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { AiService } from '../ai/ai.service'
import { NotificationsService } from '../notifications/notifications.service'
import { DossierStatus } from '@guineatender/database'

@Injectable()
export class DossiersService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private notifications: NotificationsService,
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

  // ── Soumettre pour validation (WRITER ou MANAGER) ──────────────────────────
  async soumettreValidation(id: string, organisationId: string, userId: string) {
    const dossier = await this.findOne(id, organisationId)

    const statusesAutorisés: DossierStatus[] = ['BROUILLON', 'EN_COURS', 'REJETE']
    if (!statusesAutorisés.includes(dossier.status as DossierStatus)) {
      throw new BadRequestException(
        `Le dossier est en statut "${dossier.status}" et ne peut pas être envoyé en validation.`,
      )
    }

    // Vérifier que le dossier a un contenu minimal
    const mem = dossier.memTechnique as any
    if (!mem || Object.keys(mem).length === 0) {
      throw new BadRequestException(
        'Le dossier doit contenir une mémoire technique avant validation.',
      )
    }

    const updated = await this.prisma.dossier.update({
      where: { id },
      data: { status: 'EN_VALIDATION', validatedById: null, validatedAt: null, validationNote: null },
      include: {
        ao: { select: { titre: true } },
        createdBy: { select: { email: true, prenom: true } },
        organisation: {
          select: {
            users: {
              where: { role: { in: ['ADMIN', 'MANAGER'] }, isActive: true },
              select: { email: true, prenom: true },
            },
          },
        },
      },
    })

    // Notifier tous les managers/admins
    const notifTargets = updated.organisation.users
    await Promise.all(
      notifTargets.map(u =>
        this.notifications.envoyerAlerteValidation(
          u.email,
          u.prenom,
          updated.ao.titre,
          id,
          updated.createdBy.prenom,
        ),
      ),
    )

    return updated
  }

  // ── Valider (MANAGER ou ADMIN seulement) ───────────────────────────────────
  async valider(
    id: string,
    organisationId: string,
    valideurId: string,
    valideurRole: string,
    data: { commentaire: string; checklistOk?: string[] },
  ) {
    if (!['ADMIN', 'MANAGER'].includes(valideurRole)) {
      throw new ForbiddenException('Seuls les MANAGER et ADMIN peuvent valider un dossier.')
    }

    const dossier = await this.findOne(id, organisationId)
    if (dossier.status !== 'EN_VALIDATION') {
      throw new BadRequestException('Le dossier n\'est pas en attente de validation.')
    }

    await this.prisma.dossierValidation.create({
      data: {
        dossierId: id,
        valideurId,
        decision: 'APPROUVE',
        commentaire: data.commentaire,
        checklistOk: data.checklistOk ?? [],
      },
    })

    const updated = await this.prisma.dossier.update({
      where: { id },
      data: {
        status: 'VALIDE',
        validatedById: valideurId,
        validatedAt: new Date(),
        validationNote: data.commentaire,
      },
      include: {
        ao: { select: { titre: true } },
        createdBy: { select: { email: true, prenom: true } },
      },
    })

    // Notifier le créateur
    await this.notifications.envoyerResultatValidation(
      updated.createdBy.email,
      updated.createdBy.prenom,
      updated.ao.titre,
      'APPROUVE',
      data.commentaire,
      id,
    )

    return updated
  }

  // ── Rejeter (MANAGER ou ADMIN seulement) ───────────────────────────────────
  async rejeter(
    id: string,
    organisationId: string,
    valideurId: string,
    valideurRole: string,
    data: { commentaire: string },
  ) {
    if (!['ADMIN', 'MANAGER'].includes(valideurRole)) {
      throw new ForbiddenException('Seuls les MANAGER et ADMIN peuvent rejeter un dossier.')
    }

    const dossier = await this.findOne(id, organisationId)
    if (dossier.status !== 'EN_VALIDATION') {
      throw new BadRequestException('Le dossier n\'est pas en attente de validation.')
    }

    if (!data.commentaire?.trim()) {
      throw new BadRequestException('Un commentaire est obligatoire pour rejeter un dossier.')
    }

    await this.prisma.dossierValidation.create({
      data: {
        dossierId: id,
        valideurId,
        decision: 'REJETE',
        commentaire: data.commentaire,
      },
    })

    const updated = await this.prisma.dossier.update({
      where: { id },
      data: {
        status: 'REJETE',
        validationNote: data.commentaire,
      },
      include: {
        ao: { select: { titre: true } },
        createdBy: { select: { email: true, prenom: true } },
      },
    })

    // Notifier le créateur avec les corrections à apporter
    await this.notifications.envoyerResultatValidation(
      updated.createdBy.email,
      updated.createdBy.prenom,
      updated.ao.titre,
      'REJETE',
      data.commentaire,
      id,
    )

    return updated
  }

  async getHistoriqueValidations(id: string, organisationId: string) {
    await this.findOne(id, organisationId)
    return this.prisma.dossierValidation.findMany({
      where: { dossierId: id },
      include: {
        valideur: { select: { prenom: true, nom: true, role: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  // ── Soumettre officiellement (après validation) ────────────────────────────
  async soumettre(id: string, organisationId: string, reference?: string) {
    const dossier = await this.findOne(id, organisationId)

    if (dossier.status !== 'VALIDE') {
      throw new BadRequestException(
        'Le dossier doit être validé par un manager avant soumission officielle.',
      )
    }

    const updated = await this.prisma.dossier.update({
      where: { id },
      data: {
        status: 'SOUMIS',
        soumisAt: new Date(),
        referenceSoumission: reference,
      },
      include: { ao: true },
    })

    await this.prisma.appelOffre.update({
      where: { id: updated.aoId },
      data: { status: 'SOUMIS' },
    })

    return updated
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

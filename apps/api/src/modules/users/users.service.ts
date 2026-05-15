import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { hash } from 'bcryptjs'
import { randomBytes } from 'crypto'

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(organisationId: string) {
    return this.prisma.user.findMany({
      where: { organisationId },
      select: { id: true, email: true, prenom: true, nom: true, role: true, isActive: true, lastLoginAt: true, avatarUrl: true },
      orderBy: { prenom: 'asc' },
    })
  }

  async findOne(id: string, organisationId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, organisationId },
      select: { id: true, email: true, prenom: true, nom: true, role: true, isActive: true },
    })
    if (!user) throw new NotFoundException('Utilisateur introuvable')
    return user
  }

  async update(id: string, organisationId: string, data: any) {
    await this.findOne(id, organisationId)
    // Liste blanche des champs autorisés — empêche la modification de role, organisationId, etc.
    const allowedFields = ['prenom', 'nom', 'telephone', 'avatarUrl']
    const updateData: any = {}
    for (const key of allowedFields) {
      if (data[key] !== undefined) updateData[key] = data[key]
    }
    if (data.password) {
      updateData.passwordHash = await hash(data.password, 12)
    }
    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, email: true, prenom: true, nom: true, role: true, telephone: true, avatarUrl: true },
    })
  }

  async toggleActive(id: string, organisationId: string) {
    const user = await this.findOne(id, organisationId)
    return this.prisma.user.update({
      where: { id },
      data: { isActive: !(user as any).isActive },
    })
  }

  async inviter(organisationId: string, inviteurId: string, data: { email: string; prenom: string; nom: string; role: string }) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } })
    if (existing) throw new ConflictException('Un compte existe déjà avec cet email')

    const tempPassword = randomBytes(8).toString('hex')
    const passwordHash = await hash(tempPassword, 12)

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        prenom: data.prenom,
        nom: data.nom,
        role: data.role as any,
        passwordHash,
        organisationId,
        isActive: true,
      },
      select: { id: true, email: true, prenom: true, nom: true, role: true },
    })

    return { ...user, tempPassword }
  }

  async deleteUser(id: string, organisationId: string, requesterId: string) {
    if (id === requesterId) throw new ConflictException('Impossible de supprimer votre propre compte')
    await this.findOne(id, organisationId)
    return this.prisma.user.delete({ where: { id } })
  }
}

import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { hash } from 'bcryptjs'

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
    const updateData: any = { ...data }
    if (data.password) {
      updateData.passwordHash = await hash(data.password, 12)
      delete updateData.password
    }
    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, email: true, prenom: true, nom: true, role: true },
    })
  }

  async toggleActive(id: string, organisationId: string) {
    const user = await this.findOne(id, organisationId)
    return this.prisma.user.update({
      where: { id },
      data: { isActive: !(user as any).isActive },
    })
  }
}

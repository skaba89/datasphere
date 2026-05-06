import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { compare, hash } from 'bcryptjs'
import { PrismaService } from '../../common/prisma/prisma.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (existing) throw new ConflictException('Un compte avec cet email existe déjà')

    const passwordHash = await hash(dto.password, 12)

    // Créer l'organisation si nouvelle
    let orgId = dto.organisationId
    if (!orgId && dto.organisationNom) {
      const slug = dto.organisationNom
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
      const org = await this.prisma.organisation.create({
        data: {
          nom: dto.organisationNom,
          slug: `${slug}-${Date.now()}`,
          pays: 'GN',
        },
      })
      orgId = org.id
    }

    if (!orgId) throw new BadRequestException('Organisation requise')

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        prenom: dto.prenom,
        nom: dto.nom,
        telephone: dto.telephone,
        organisationId: orgId,
      },
      select: {
        id: true,
        email: true,
        prenom: true,
        nom: true,
        role: true,
        organisationId: true,
        organisation: { select: { id: true, nom: true, plan: true } },
      },
    })

    const tokens = await this.generateTokens(user.id, user.email, user.organisationId, user.role)
    return { user, ...tokens }
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.password)
    if (!user) throw new UnauthorizedException('Email ou mot de passe incorrect')

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    const tokens = await this.generateTokens(user.id, user.email, user.organisationId, user.role)
    return { user, ...tokens }
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { organisation: { select: { id: true, nom: true, plan: true } } },
    })
    if (!user || !user.passwordHash) return null
    if (!user.isActive) throw new UnauthorizedException('Compte désactivé')

    const valid = await compare(password, user.passwordHash)
    if (!valid) return null

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...result } = user
    return result
  }

  async refreshToken(token: string) {
    const stored = await this.prisma.refreshToken.findUnique({ where: { token } })
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Token de rafraîchissement invalide')
    }

    const user = await this.prisma.user.findUnique({
      where: { id: stored.userId },
      select: { id: true, email: true, organisationId: true, role: true },
    })
    if (!user) throw new UnauthorizedException()

    // Révoquer l'ancien token (rotation)
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    })

    return this.generateTokens(user.id, user.email, user.organisationId, user.role)
  }

  async logout(token: string) {
    await this.prisma.refreshToken.updateMany({
      where: { token },
      data: { revokedAt: new Date() },
    })
  }

  private async generateTokens(userId: string, email: string, organisationId: string, role: string) {
    const payload = { sub: userId, email, organisationId, role }
    const accessToken = this.jwt.sign(payload)

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    const refreshTokenRecord = await this.prisma.refreshToken.create({
      data: {
        token: `rt_${userId}_${Date.now()}_${Math.random().toString(36)}`,
        userId,
        expiresAt,
      },
    })

    return {
      accessToken,
      refreshToken: refreshTokenRecord.token,
      expiresIn: this.config.get('JWT_EXPIRES_IN', '7d'),
    }
  }
}

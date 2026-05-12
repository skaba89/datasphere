import { Controller, Post, Get, Param, UseGuards, Request, NotFoundException } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { ScoringService } from './scoring.service'
import { PrismaService } from '../../common/prisma/prisma.service'

@ApiTags('Scoring')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('scoring')
export class ScoringController {
  constructor(
    private service: ScoringService,
    private prisma: PrismaService,
  ) {}

  @Get(':aoId')
  @ApiOperation({ summary: 'Récupérer le dernier scoring calculé d\'un AO' })
  async get(@Request() req: any, @Param('aoId') aoId: string) {
    const ao = await this.prisma.appelOffre.findFirst({
      where: { id: aoId, organisationId: req.user.organisationId },
      select: { score: true, scoreDetails: true, scoreUpdatedAt: true },
    })
    if (!ao) throw new NotFoundException('AO introuvable')
    const details = ao.scoreDetails as any
    return {
      scoreFinal: ao.score,
      scoreUpdatedAt: ao.scoreUpdatedAt,
      dimensions: details?.dimensions ?? [],
      recommandation: details?.recommandation ?? null,
      alertes: details?.alertes ?? [],
    }
  }

  @Post(':aoId/calculer')
  @ApiOperation({ summary: 'Calculer ou recalculer le score d\'un AO' })
  calculer(@Request() req: any, @Param('aoId') aoId: string) {
    return this.service.calculerScore(aoId, req.user.organisationId)
  }
}

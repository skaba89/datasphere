import { Controller, Post, Get, Param, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { ScoringService } from './scoring.service'

@ApiTags('Scoring')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('scoring')
export class ScoringController {
  constructor(private service: ScoringService) {}

  @Post(':aoId/calculer')
  @ApiOperation({ summary: 'Calculer ou recalculer le score d\'un AO' })
  calculer(@Request() req: any, @Param('aoId') aoId: string) {
    return this.service.calculerScore(aoId, req.user.organisationId)
  }
}

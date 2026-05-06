import { Controller, Post, Param, Body, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AiService } from './ai.service'
import { IsOptional, IsNumber, IsString } from 'class-validator'

class GenererMemTechniqueDto {
  @IsOptional()
  @IsString()
  solutionId?: string
}

class GenererOffreFinanciereDto {
  @IsOptional()
  @IsNumber()
  margePercent?: number

  @IsOptional()
  @IsNumber()
  dureeM?: number
}

@ApiTags('AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('ao/:aoId/mem-technique')
  @ApiOperation({ summary: 'Générer le mémoire technique d\'un AO par IA' })
  genererMemTechnique(
    @Request() req: any,
    @Param('aoId') aoId: string,
    @Body() dto: GenererMemTechniqueDto,
  ) {
    return this.aiService.genererMemTechnique(aoId, req.user.organisationId, dto)
  }

  @Post('ao/:aoId/offre-financiere')
  @ApiOperation({ summary: 'Générer l\'offre financière d\'un AO par IA' })
  genererOffreFinanciere(
    @Request() req: any,
    @Param('aoId') aoId: string,
    @Body() dto: GenererOffreFinanciereDto,
  ) {
    return this.aiService.genererOffreFinanciere(aoId, req.user.organisationId, dto)
  }

  @Post('ao/:aoId/resumer')
  @ApiOperation({ summary: 'Résumer un AO pour décision rapide Go/No-Go' })
  resumer(@Request() req: any, @Param('aoId') aoId: string) {
    return this.aiService.resumerAO(aoId, req.user.organisationId)
  }
}

import {
  Controller, Get, Post, Put, Patch, Delete,
  Param, Body, Query, UseGuards, Request, HttpCode, HttpStatus
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AppelsOffresService } from './appels-offres.service'
import { CreateAODto } from './dto/create-ao.dto'
import { UpdateAODto } from './dto/update-ao.dto'
import { QueryAODto } from './dto/query-ao.dto'

@ApiTags('Appels d\'Offres')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('appels-offres')
export class AppelsOffresController {
  constructor(private service: AppelsOffresService) {}

  @Get()
  @ApiOperation({ summary: 'Lister tous les appels d\'offres' })
  findAll(@Request() req: any, @Query() query: QueryAODto) {
    return this.service.findAll(req.user.organisationId, query)
  }

  @Get('stats')
  @ApiOperation({ summary: 'Statistiques globales des AOs' })
  getStats(@Request() req: any) {
    return this.service.getStats(req.user.organisationId)
  }

  @Get('pipeline')
  @ApiOperation({ summary: 'Vue pipeline Kanban des opportunités' })
  getPipeline(@Request() req: any) {
    return this.service.getPipeline(req.user.organisationId)
  }

  @Get('tendance')
  @ApiOperation({ summary: 'Tendance mensuelle sur 6 mois' })
  getTendance(@Request() req: any) {
    return this.service.getTendanceMensuelle(req.user.organisationId)
  }

  @Get('par-secteur')
  @ApiOperation({ summary: 'Répartition valeur par secteur' })
  getParSecteur(@Request() req: any) {
    return this.service.getParSecteur(req.user.organisationId)
  }

  @Get('par-source')
  @ApiOperation({ summary: 'Performance par source de veille' })
  getParSource(@Request() req: any) {
    return this.service.getParSource(req.user.organisationId)
  }

  @Get('activite')
  @ApiOperation({ summary: 'Activité récente de l\'organisation' })
  getActivite(@Request() req: any) {
    return this.service.getActiviteRecente(req.user.organisationId)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un appel d\'offres' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.service.findOne(id, req.user.organisationId)
  }

  @Post()
  @ApiOperation({ summary: 'Créer un appel d\'offres manuellement' })
  create(@Request() req: any, @Body() dto: CreateAODto) {
    return this.service.create(req.user.organisationId, req.user.id, dto)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier un appel d\'offres' })
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateAODto) {
    return this.service.update(id, req.user.organisationId, dto)
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Mettre à jour le statut (Go/No-Go, soumis, etc.)' })
  updateStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { status: string; motif?: string },
  ) {
    return this.service.updateStatus(id, req.user.organisationId, body.status as any, body.motif)
  }

  @Post(':id/assign/:userId')
  @ApiOperation({ summary: 'Assigner un utilisateur à un AO' })
  assign(@Request() req: any, @Param('id') id: string, @Param('userId') userId: string) {
    return this.service.assignUser(id, req.user.organisationId, userId)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un appel d\'offres' })
  delete(@Request() req: any, @Param('id') id: string) {
    return this.service.delete(id, req.user.organisationId)
  }
}

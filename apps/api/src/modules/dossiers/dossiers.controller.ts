import { Controller, Get, Post, Put, Param, Body, Query, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { DossiersService } from './dossiers.service'

@ApiTags('Dossiers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dossiers')
export class DossiersController {
  constructor(private service: DossiersService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les dossiers de réponse' })
  findAll(@Request() req: any, @Query() query: any) {
    return this.service.findAll(req.user.organisationId, query)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un dossier' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.service.findOne(id, req.user.organisationId)
  }

  @Post()
  @ApiOperation({ summary: 'Créer un dossier de réponse pour un AO' })
  create(@Request() req: any, @Body() body: any) {
    return this.service.create(req.user.organisationId, req.user.id, body)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier le contenu du dossier' })
  update(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.service.update(id, req.user.organisationId, body)
  }

  @Post(':id/generer-ia')
  @ApiOperation({ summary: 'Générer le dossier complet avec IA (mémoire + offre financière)' })
  genererAvecIA(@Request() req: any, @Param('id') id: string) {
    return this.service.genererAvecIA(id, req.user.organisationId)
  }

  @Post(':id/soumettre')
  @ApiOperation({ summary: 'Marquer le dossier comme soumis' })
  soumettre(@Request() req: any, @Param('id') id: string, @Body() body: { reference?: string }) {
    return this.service.soumettre(id, req.user.organisationId, body.reference)
  }

  @Post(':id/collaborateurs/:userId')
  @ApiOperation({ summary: 'Inviter un collaborateur sur le dossier' })
  addCollab(@Request() req: any, @Param('id') id: string, @Param('userId') userId: string) {
    return this.service.addCollaborateur(id, req.user.organisationId, userId)
  }

  @Get(':id/checklist')
  @ApiOperation({ summary: 'Obtenir la checklist des pièces administratives' })
  getChecklist(@Request() req: any, @Param('id') id: string) {
    return this.service.getChecklist(id, req.user.organisationId)
  }
}

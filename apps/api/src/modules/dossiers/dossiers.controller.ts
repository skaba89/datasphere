import { Controller, Get, Post, Put, Param, Body, Query, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger'
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
  genererAvecIA(@Request() req: any, @Param('id') id: string, @Body() body: { typeSolution?: string }) {
    return this.service.genererAvecIA(id, req.user.organisationId, body)
  }

  // ── Workflow de validation ──────────────────────────────────────────────────

  @Post(':id/soumettre-validation')
  @ApiOperation({ summary: 'Soumettre le dossier pour validation manager avant envoi officiel' })
  soumettreValidation(@Request() req: any, @Param('id') id: string) {
    return this.service.soumettreValidation(id, req.user.organisationId, req.user.id)
  }

  @Post(':id/valider')
  @ApiOperation({ summary: 'Valider le dossier (MANAGER / ADMIN uniquement)' })
  @ApiBody({ schema: { properties: { commentaire: { type: 'string' }, checklistOk: { type: 'array', items: { type: 'string' } } } } })
  valider(@Request() req: any, @Param('id') id: string, @Body() body: { commentaire: string; checklistOk?: string[] }) {
    return this.service.valider(id, req.user.organisationId, req.user.id, req.user.role, body)
  }

  @Post(':id/rejeter')
  @ApiOperation({ summary: 'Rejeter le dossier avec commentaires (MANAGER / ADMIN uniquement)' })
  @ApiBody({ schema: { properties: { commentaire: { type: 'string' } } } })
  rejeter(@Request() req: any, @Param('id') id: string, @Body() body: { commentaire: string }) {
    return this.service.rejeter(id, req.user.organisationId, req.user.id, req.user.role, body)
  }

  @Get(':id/validations')
  @ApiOperation({ summary: 'Historique des validations d\'un dossier' })
  getHistoriqueValidations(@Request() req: any, @Param('id') id: string) {
    return this.service.getHistoriqueValidations(id, req.user.organisationId)
  }

  // ── Soumission officielle ───────────────────────────────────────────────────

  @Post(':id/soumettre')
  @ApiOperation({ summary: 'Soumettre officiellement (dossier doit être VALIDÉ)' })
  soumettre(@Request() req: any, @Param('id') id: string, @Body() body: { reference?: string }) {
    return this.service.soumettre(id, req.user.organisationId, body.reference)
  }

  // ── Autres ─────────────────────────────────────────────────────────────────

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

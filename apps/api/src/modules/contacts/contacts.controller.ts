import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { ContactsService } from './contacts.service'

@ApiTags('Contacts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('contacts')
export class ContactsController {
  constructor(private service: ContactsService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les contacts du CRM' })
  findAll(@Request() req: any, @Query() query: any) {
    return this.service.findAll(req.user.organisationId, query)
  }

  @Get('stats')
  @ApiOperation({ summary: 'Statistiques du CRM' })
  getStats(@Request() req: any) {
    return this.service.getStats(req.user.organisationId)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un contact' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.service.findOne(id, req.user.organisationId)
  }

  @Post()
  @ApiOperation({ summary: 'Créer un contact' })
  create(@Request() req: any, @Body() body: any) {
    return this.service.create(req.user.organisationId, body)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier un contact' })
  update(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.service.update(id, req.user.organisationId, body)
  }

  @Post(':id/interactions')
  @ApiOperation({ summary: 'Ajouter une interaction (réunion, appel, email...)' })
  addInteraction(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.service.addInteraction(id, req.user.organisationId, req.user.id, body)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un contact' })
  delete(@Request() req: any, @Param('id') id: string) {
    return this.service.delete(id, req.user.organisationId)
  }
}

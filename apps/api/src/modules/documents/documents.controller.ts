import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { DocumentsService } from './documents.service'

@ApiTags('Documents Administratifs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private service: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les documents administratifs de l\'organisation' })
  findAll(@Request() req: any) {
    return this.service.findAll(req.user.organisationId)
  }

  @Get('alertes')
  @ApiOperation({ summary: 'Documents expirant dans les 30 prochains jours' })
  getAlertes(@Request() req: any) {
    return this.service.getAlertes(req.user.organisationId)
  }

  @Post()
  @ApiOperation({ summary: 'Ajouter un document' })
  create(@Request() req: any, @Body() body: any) {
    return this.service.create(req.user.organisationId, body)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier un document' })
  update(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.service.update(id, req.user.organisationId, body)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un document' })
  delete(@Request() req: any, @Param('id') id: string) {
    return this.service.delete(id, req.user.organisationId)
  }
}

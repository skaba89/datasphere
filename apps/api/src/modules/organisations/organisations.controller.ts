import { Controller, Get, Put, Post, Body, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { OrganisationsService } from './organisations.service'

@ApiTags('Organisation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organisation')
export class OrganisationsController {
  constructor(private service: OrganisationsService) {}

  @Get()
  @ApiOperation({ summary: 'Profil de l\'organisation' })
  findOne(@Request() req: any) {
    return this.service.findOne(req.user.organisationId)
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard synthétique de l\'organisation' })
  getDashboard(@Request() req: any) {
    return this.service.getDashboard(req.user.organisationId)
  }

  @Put()
  @ApiOperation({ summary: 'Modifier le profil de l\'organisation' })
  update(@Request() req: any, @Body() body: any) {
    return this.service.update(req.user.organisationId, body)
  }

  @Put('scoring-config')
  @ApiOperation({ summary: 'Configurer les paramètres de scoring' })
  updateScoringConfig(@Request() req: any, @Body() config: any) {
    return this.service.updateScoringConfig(req.user.organisationId, config)
  }

  @Get('references')
  @ApiOperation({ summary: 'Références techniques de l\'organisation' })
  getReferences(@Request() req: any) {
    return this.service.getReferences(req.user.organisationId)
  }

  @Post('references')
  @ApiOperation({ summary: 'Ajouter une référence technique' })
  createReference(@Request() req: any, @Body() body: any) {
    return this.service.createReference(req.user.organisationId, body)
  }

  @Get('experts')
  @ApiOperation({ summary: 'Experts de l\'organisation' })
  getExperts(@Request() req: any) {
    return this.service.getExperts(req.user.organisationId)
  }

  @Post('experts')
  @ApiOperation({ summary: 'Ajouter un expert' })
  createExpert(@Request() req: any, @Body() body: any) {
    return this.service.createExpert(req.user.organisationId, body)
  }
}

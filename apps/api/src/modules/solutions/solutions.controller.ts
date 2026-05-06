import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { SolutionsService } from './solutions.service'

@ApiTags('Solutions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('solutions')
export class SolutionsController {
  constructor(private service: SolutionsService) {}

  @Get()
  @ApiOperation({ summary: 'Bibliothèque de templates de solutions SaaS' })
  findAll(@Query() query: any) {
    return this.service.findAll(query)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un template de solution' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id)
  }

  @Post(':id/estimer')
  @ApiOperation({ summary: 'Estimer le coût d\'une solution selon la configuration' })
  estimer(@Param('id') id: string, @Body() config: any) {
    return this.service.estimer(id, config)
  }

  @Post(':id/generer-description')
  @ApiOperation({ summary: 'Générer la description technique pour un dossier AO' })
  genererDescription(@Param('id') id: string, @Body() config: any) {
    return this.service.genererDescription(id, config)
  }
}

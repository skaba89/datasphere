import { Controller, Post, Get, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { ScrapingService } from './scraping.service'

@ApiTags('Scraping / Veille')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('scraping')
export class ScrapingController {
  constructor(private service: ScrapingService) {}

  @Post('lancer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lancer manuellement la veille multi-sources' })
  lancer(@Request() req: any) {
    return this.service.scraperToutes(req.user.organisationId)
  }

  @Get('sources')
  @ApiOperation({ summary: 'Lister les sources de veille disponibles' })
  sources(@Request() req: any) {
    return this.service.getSourcesForOrg(req.user.organisationId)
  }
}

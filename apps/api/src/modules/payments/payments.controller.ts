import { Controller, Post, Get, Param, Body, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PaymentsService } from './payments.service'

@ApiTags('Paiements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private service: PaymentsService) {}

  @Post('initier')
  @ApiOperation({ summary: 'Initier un paiement Mobile Money (Orange Money / MTN MoMo)' })
  initier(@Request() req: any, @Body() body: { plan: any; methode: any }) {
    return this.service.initierPaiement(req.user.organisationId, body.plan, body.methode)
  }

  @Post(':id/confirmer')
  @ApiOperation({ summary: 'Confirmer un paiement (webhook ou manuel)' })
  confirmer(@Param('id') id: string, @Body() body: { transactionId: string }) {
    return this.service.confirmerPaiement(id, body.transactionId)
  }

  @Get('historique')
  @ApiOperation({ summary: 'Historique des paiements' })
  getHistorique(@Request() req: any) {
    return this.service.getHistorique(req.user.organisationId)
  }
}

import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../common/prisma/prisma.service'
import { PaymentMethod, SubscriptionPlan } from '@guineatender/database'

const PLANS_PRIX: Record<SubscriptionPlan, number> = {
  STARTER: 150_000,
  PRO: 450_000,
  ENTERPRISE: 2_000_000,
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name)

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async initierPaiement(organisationId: string, plan: SubscriptionPlan, methode: PaymentMethod) {
    const montantGNF = PLANS_PRIX[plan]

    const payment = await this.prisma.payment.create({
      data: {
        montantGNF: BigInt(montantGNF),
        methode,
        status: 'PENDING',
        description: `Abonnement GuineaTender AI — Plan ${plan}`,
        metadata: { plan, periode: 'mensuel' },
        organisationId,
      },
    })

    if (methode === PaymentMethod.ORANGE_MONEY) {
      return this.initierOrangeMoney(payment.id, montantGNF, organisationId)
    }

    if (methode === PaymentMethod.MTN_MOMO) {
      return this.initierMTNMoMo(payment.id, montantGNF, organisationId)
    }

    return { paymentId: payment.id, montantGNF, instructions: 'Virement bancaire — contacts: payment@guineatender.ai' }
  }

  private async initierOrangeMoney(paymentId: string, montant: number, organisationId: string) {
    const callbackUrl = `${this.config.get('API_URL')}/webhooks/orange-money`
    const merchantKey = this.config.get('ORANGE_MONEY_MERCHANT_KEY')

    // En production: appel API Orange Money
    this.logger.log(`Orange Money initialisé pour paiement ${paymentId}`)

    return {
      paymentId,
      methode: 'ORANGE_MONEY',
      montantGNF: montant,
      instructions: `Envoyez ${montant.toLocaleString('fr-FR')} GNF au 620 000 000 avec la référence ${paymentId}`,
      reference: paymentId,
      ussdCode: `*144*1*${montant}*${paymentId}#`,
    }
  }

  private async initierMTNMoMo(paymentId: string, montant: number, organisationId: string) {
    this.logger.log(`MTN MoMo initialisé pour paiement ${paymentId}`)

    return {
      paymentId,
      methode: 'MTN_MOMO',
      montantGNF: montant,
      instructions: `Envoyez ${montant.toLocaleString('fr-FR')} GNF via MTN MoMo avec la référence ${paymentId}`,
      reference: paymentId,
    }
  }

  async confirmerPaiement(paymentId: string, transactionId: string) {
    const payment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'COMPLETED',
        transactionId,
      },
      include: { organisation: true },
    })

    const plan = (payment.metadata as any)?.plan as SubscriptionPlan
    if (plan) {
      const expiration = new Date()
      expiration.setMonth(expiration.getMonth() + 1)

      await this.prisma.organisation.update({
        where: { id: payment.organisationId },
        data: {
          plan,
          planStatus: 'ACTIVE',
          planExpiresAt: expiration,
        },
      })
    }

    return { success: true, paymentId, plan }
  }

  async getHistorique(organisationId: string) {
    return this.prisma.payment.findMany({
      where: { organisationId },
      orderBy: { createdAt: 'desc' },
    })
  }
}

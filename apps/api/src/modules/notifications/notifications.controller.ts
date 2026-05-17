import { Controller, Get, Patch, Param, Query, UseGuards, Request, NotFoundException } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PrismaService } from '../../common/prisma/prisma.service'

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les alertes/notifications in-app' })
  async findAll(@Request() req: any, @Query('lue') lue?: string) {
    const alertes = await this.prisma.alerte.findMany({
      where: {
        ao: { organisationId: req.user.organisationId },
        ...(lue !== undefined ? { lue: lue === 'true' } : {}),
      },
      include: {
        ao: { select: { id: true, titre: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return alertes
  }

  @Get('count')
  @ApiOperation({ summary: 'Nombre d\'alertes non lues' })
  async countUnread(@Request() req: any) {
    const count = await this.prisma.alerte.count({
      where: {
        ao: { organisationId: req.user.organisationId },
        lue: false,
      },
    })
    return { count }
  }

  @Patch(':id/lire')
  @ApiOperation({ summary: 'Marquer une alerte comme lue' })
  async marquerLue(@Request() req: any, @Param('id') id: string) {
    // Vérifier que l'alerte appartient à l'organisation de l'utilisateur via la relation ao
    const alerte = await this.prisma.alerte.findFirst({
      where: {
        id,
        ao: { organisationId: req.user.organisationId },
      },
    })
    if (!alerte) {
      throw new NotFoundException('Alerte non trouvée')
    }
    return this.prisma.alerte.update({
      where: { id },
      data: { lue: true, lueAt: new Date() },
    })
  }

  @Patch('lire-tout')
  @ApiOperation({ summary: 'Marquer toutes les alertes comme lues' })
  async marquerToutLu(@Request() req: any) {
    // Récupérer les IDs des alertes de l'organisation via la relation ao
    const alertes = await this.prisma.alerte.findMany({
      where: {
        ao: { organisationId: req.user.organisationId },
        lue: false,
      },
      select: { id: true },
    })
    const ids = alertes.map(a => a.id)

    if (ids.length > 0) {
      await this.prisma.alerte.updateMany({
        where: { id: { in: ids } },
        data: { lue: true, lueAt: new Date() },
      })
    }
    return { message: 'Toutes les alertes marquées comme lues' }
  }
}

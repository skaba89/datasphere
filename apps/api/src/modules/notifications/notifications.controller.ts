import { Controller, Get, Patch, Param, Query, UseGuards, Request } from '@nestjs/common'
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
        ...(lue !== undefined ? { lue: lue === 'true' } : {}),
        OR: [
          { ao: { organisationId: req.user.organisationId } },
          { aoId: null },
        ],
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
        lue: false,
        OR: [
          { ao: { organisationId: req.user.organisationId } },
          { aoId: null },
        ],
      },
    })
    return { count }
  }

  @Patch(':id/lire')
  @ApiOperation({ summary: 'Marquer une alerte comme lue' })
  async marquerLue(@Param('id') id: string) {
    return this.prisma.alerte.update({
      where: { id },
      data: { lue: true, lueAt: new Date() },
    })
  }

  @Patch('lire-tout')
  @ApiOperation({ summary: 'Marquer toutes les alertes comme lues' })
  async marquerToutLu(@Request() req: any) {
    await this.prisma.alerte.updateMany({
      where: {
        lue: false,
        OR: [
          { ao: { organisationId: req.user.organisationId } },
          { aoId: null },
        ],
      },
      data: { lue: true, lueAt: new Date() },
    })
    return { message: 'Toutes les alertes marquées comme lues' }
  }
}

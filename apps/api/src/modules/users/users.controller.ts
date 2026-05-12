import { Controller, Get, Put, Patch, Post, Delete, Param, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { UsersService } from './users.service'

@ApiTags('Utilisateurs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private service: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les utilisateurs de l\'organisation' })
  findAll(@Request() req: any) {
    return this.service.findAll(req.user.organisationId)
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.service.findOne(id, req.user.organisationId)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier un utilisateur' })
  update(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.service.update(id, req.user.organisationId, body)
  }

  @Patch(':id/toggle-active')
  @ApiOperation({ summary: 'Activer / désactiver un utilisateur' })
  toggleActive(@Request() req: any, @Param('id') id: string) {
    return this.service.toggleActive(id, req.user.organisationId)
  }

  @Post('inviter')
  @ApiOperation({ summary: 'Inviter un nouveau membre dans l\'organisation' })
  inviter(@Request() req: any, @Body() body: { email: string; prenom: string; nom: string; role: string }) {
    return this.service.inviter(req.user.organisationId, req.user.id, body)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un utilisateur de l\'organisation' })
  deleteUser(@Request() req: any, @Param('id') id: string) {
    return this.service.deleteUser(id, req.user.organisationId, req.user.id)
  }
}

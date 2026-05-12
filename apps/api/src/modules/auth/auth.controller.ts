import { Controller, Post, Body, UseGuards, Request, Get, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { ThrottlerGuard } from '@nestjs/throttler'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { RefreshTokenDto } from './dto/refresh-token.dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'

@ApiTags('Auth')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Créer un compte entreprise' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto)
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connexion utilisateur' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto)
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rafraîchir le token d\'accès' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken)
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Déconnexion' })
  async logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Profil de l\'utilisateur connecté' })
  async me(@Request() req: any) {
    return req.user
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Changer son mot de passe' })
  async changePassword(
    @Request() req: any,
    @Body() body: { ancienMotDePasse: string; nouveauMotDePasse: string },
  ) {
    return this.authService.changePassword(req.user.id, body.ancienMotDePasse, body.nouveauMotDePasse)
  }
}

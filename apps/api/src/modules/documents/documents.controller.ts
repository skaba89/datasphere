import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request, HttpCode, HttpStatus, UploadedFile, UseInterceptors, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { UserRole } from '@guineatender/database'
import { DocumentsService } from './documents.service'
import { StorageService } from '../../common/storage/storage.service'
import { FileInterceptor } from '@nestjs/platform-express'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = /(pdf|jpeg|jpg|png|doc|docx|xls|xlsx)$/

@ApiTags('Documents Administratifs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('documents')
export class DocumentsController {
  constructor(
    private service: DocumentsService,
    private storage: StorageService,
  ) {}

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

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WRITER)
  @ApiOperation({ summary: 'Uploader un fichier document (max 10MB, PDF/images/Office)' })
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Request() req: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body('type') type?: string,
    @Body('nom') nom?: string,
  ) {
    const result = await this.storage.upload(
      'documents',
      file.originalname,
      file.buffer,
      file.mimetype,
      req.user.organisationId,
    )

    // Créer l'entrée en base
    const doc = await this.service.create(req.user.organisationId, {
      type: type || 'AUTRE',
      nom: nom || file.originalname,
      fileUrl: result.url,
      fileSize: result.size,
      mimeType: result.mimeType,
    })

    return { ...doc, storageKey: result.key }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier un document' })
  update(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.service.update(id, req.user.organisationId, body)
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un document' })
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.service.delete(id, req.user.organisationId)
  }
}

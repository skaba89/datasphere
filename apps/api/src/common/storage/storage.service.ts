import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as Minio from 'minio'

export interface StorageUploadResult {
  key: string
  url: string
  size: number
  mimeType: string
}

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name)
  private client: Minio.Client
  private bucket: string

  constructor(private config: ConfigService) {
    this.bucket = this.config.get<string>('MINIO_BUCKET', 'guineatender')
    this.client = new Minio.Client({
      endPoint: this.config.get<string>('MINIO_ENDPOINT', 'localhost'),
      port: parseInt(this.config.get<string>('MINIO_PORT', '9000'), 10),
      useSSL: this.config.get<string>('MINIO_USE_SSL', 'false') === 'true',
      accessKey: this.config.get<string>('MINIO_ACCESS_KEY', 'minioadmin'),
      secretKey: this.config.get<string>('MINIO_SECRET_KEY', 'minioadmin'),
    })
  }

  async onModuleInit() {
    // Créer le bucket s'il n'existe pas
    const exists = await this.client.bucketExists(this.bucket).catch(() => false)
    if (!exists) {
      await this.client.makeBucket(this.bucket, 'africa')
      this.logger.log(`Bucket "${this.bucket}" créé`)
    }
  }

  /**
   * Upload un fichier dans le bucket MinIO
   * @param folder Préfixe du dossier (ex: 'documents', 'avatars', 'exports')
   * @param fileName Nom du fichier original
   * @param buffer Contenu du fichier
   * @param mimeType Type MIME
   * @param organisationId ID de l'organisation pour isolation
   */
  async upload(
    folder: string,
    fileName: string,
    buffer: Buffer,
    mimeType: string,
    organisationId: string,
  ): Promise<StorageUploadResult> {
    // Clé structurée: orgId/folder/timestamp-filename
    const timestamp = Date.now()
    const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const key = `${organisationId}/${folder}/${timestamp}-${sanitized}`

    await this.client.putObject(this.bucket, key, buffer, buffer.length, {
      'Content-Type': mimeType,
      'x-amz-meta-organisation-id': organisationId,
      'x-amz-meta-original-name': fileName,
    })

    const url = this.buildUrl(key)

    this.logger.log(`Fichier uploadé: ${key} (${buffer.length} octets)`)

    return {
      key,
      url,
      size: buffer.length,
      mimeType,
    }
  }

  /**
   * Supprime un fichier du bucket
   */
  async delete(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key)
    this.logger.log(`Fichier supprimé: ${key}`)
  }

  /**
   * Génère une URL présignée pour téléchargement temporaire (7 jours max)
   */
  async getPresignedUrl(key: string, expirySeconds = 3600): Promise<string> {
    return this.client.presignedGetObject(this.bucket, key, expirySeconds)
  }

  /**
   * Vérifie qu'un fichier appartient à une organisation
   */
  isOwnedByOrg(key: string, organisationId: string): boolean {
    return key.startsWith(`${organisationId}/`)
  }

  /**
   * Construit l'URL publique d'accès au fichier
   */
  private buildUrl(key: string): string {
    const endpoint = this.config.get<string>('MINIO_ENDPOINT', 'localhost')
    const port = this.config.get<string>('MINIO_PORT', '9000')
    const useSSL = this.config.get<string>('MINIO_USE_SSL', 'false') === 'true'
    const protocol = useSSL ? 'https' : 'http'
    return `${protocol}://${endpoint}:${port}/${this.bucket}/${key}`
  }
}

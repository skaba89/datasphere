import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { StorageService } from './storage.service'

describe('StorageService', () => {
  let service: StorageService
  let configService: ConfigService

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        MINIO_ENDPOINT: 'localhost',
        MINIO_PORT: '9000',
        MINIO_USE_SSL: 'false',
        MINIO_ACCESS_KEY: 'minioadmin',
        MINIO_SECRET_KEY: 'minioadmin',
        MINIO_BUCKET: 'guineatender',
      }
      return config[key] ?? defaultValue ?? ''
    }),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile()

    service = module.get<StorageService>(StorageService)
    configService = module.get<ConfigService>(ConfigService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('isOwnedByOrg', () => {
    it('devrait retourner true si le fichier appartient à l\'organisation', () => {
      const key = 'org-123/documents/1234567890-report.pdf'
      expect(service.isOwnedByOrg(key, 'org-123')).toBe(true)
    })

    it('devrait retourner false si le fichier n\'appartient pas à l\'organisation', () => {
      const key = 'org-123/documents/1234567890-report.pdf'
      expect(service.isOwnedByOrg(key, 'org-456')).toBe(false)
    })

    it('devrait retourner false pour une clé vide', () => {
      expect(service.isOwnedByOrg('', 'org-123')).toBe(false)
    })
  })
})

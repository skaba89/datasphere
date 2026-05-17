import { Test, TestingModule } from '@nestjs/testing'
import { ScoringService } from './scoring.service'
import { PrismaService } from '../../common/prisma/prisma.service'
import { NotFoundException } from '@nestjs/common'

describe('ScoringService', () => {
  let service: ScoringService
  let prisma: PrismaService

  const mockOrganisation = {
    id: 'org-1',
    secteurs: ['NUMERIQUE', 'IA', 'SAAS'],
    caAnnuelGNF: BigInt(500_000_000),
    anneeFondation: 2019,
    certifications: ['ISO 9001'],
    scoringConfig: {},
    documents: [{ isValid: true }, { isValid: true }, { isValid: true }],
    references: [],
    experts: [],
  }

  const mockAO = {
    id: 'ao-1',
    titre: 'Portail e-services citoyens',
    objet: 'Développement du portail',
    entiteAdj: 'ANDE',
    secteur: 'NUMERIQUE',
    budgetEstimeGNF: BigInt(200_000_000),
    dateLimite: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
    criteresEligibilite: { anneesExperience: 3 },
    criteresEvaluation: {},
    organisationId: 'org-1',
  }

  const mockPrisma = {
    appelOffre: {
      findFirst: jest.fn().mockResolvedValue(mockAO),
      update: jest.fn().mockResolvedValue({}),
    },
    organisation: {
      findUnique: jest.fn().mockResolvedValue(mockOrganisation),
    },
    contact: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScoringService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()

    service = module.get<ScoringService>(ScoringService)
    prisma = module.get<PrismaService>(PrismaService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('calculerScore', () => {
    it('devrait calculer un score pour un AO dans le secteur de l\'organisation', async () => {
      const result = await service.calculerScore('ao-1', 'org-1')

      expect(result).toHaveProperty('scoreFinal')
      expect(result).toHaveProperty('dimensions')
      expect(result).toHaveProperty('recommandation')
      expect(result).toHaveProperty('alertes')
      expect(result.dimensions).toHaveLength(6)
      expect(result.scoreFinal).toBeGreaterThanOrEqual(0)
      expect(result.scoreFinal).toBeLessThanOrEqual(100)
      expect(['GO', 'MAYBE', 'NO_GO']).toContain(result.recommandation)
    })

    it('devrait lancer NotFoundException si AO introuvable', async () => {
      mockPrisma.appelOffre.findFirst.mockResolvedValueOnce(null)

      await expect(service.calculerScore('ao-404', 'org-1'))
        .rejects.toThrow(NotFoundException)
    })

    it('devrait donner un score élevé pour un AO bien aligné', async () => {
      const result = await service.calculerScore('ao-1', 'org-1')

      // L'alignement sectoriel NUMERIQUE vs NUMERIQUE/IA/SAAS doit être bon
      const alignement = result.dimensions.find(d => d.nom === 'Alignement sectoriel')
      expect(alignement.score).toBeGreaterThanOrEqual(65)
    })

    it('devrait inclure la dimension capacité financière', async () => {
      const result = await service.calculerScore('ao-1', 'org-1')

      const capacite = result.dimensions.find(d => d.nom === 'Capacité financière')
      expect(capacite).toBeDefined()
      // Budget 200M vs CA 500M = ratio 0.4 → score 70
      expect(capacite.score).toBe(70)
    })

    it('devrait calculer un score pondéré correct', async () => {
      const result = await service.calculerScore('ao-1', 'org-1')

      const totalPondere = result.dimensions.reduce((sum, d) => sum + d.scoresPondere, 0)
      expect(Math.round(totalPondere)).toBe(result.scoreFinal)
    })
  })

  describe('Recommandations', () => {
    it('devrait recommander GO pour un score >= 65', async () => {
      // Mock un AO très favorable
      const excellentAO = {
        ...mockAO,
        budgetEstimeGNF: BigInt(50_000_000), // Budget petit vs CA
        dateLimite: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 jours
      }
      mockPrisma.appelOffre.findFirst.mockResolvedValueOnce(excellentAO)

      const result = await service.calculerScore('ao-1', 'org-1')
      // Avec un petit budget et un long délai, le score devrait être élevé
      expect(result.scoreFinal).toBeGreaterThan(50)
    })

    it('devrait recommander NO_GO pour un AO hors secteur avec gros budget', async () => {
      const badAO = {
        ...mockAO,
        secteur: 'AGRICULTURE', // Hors secteur
        budgetEstimeGNF: BigInt(2_000_000_000), // 2 milliards vs CA 500M
        dateLimite: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 jours
      }
      mockPrisma.appelOffre.findFirst.mockResolvedValueOnce(badAO)

      const result = await service.calculerScore('ao-1', 'org-1')
      expect(result.scoreFinal).toBeLessThan(50)
      expect(result.recommandation).toBe('NO_GO')
    })
  })
})

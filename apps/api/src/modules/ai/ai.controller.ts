import { Controller, Post, Get, Param, Body, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AiService } from './ai.service'
import { PrismaService } from '../../common/prisma/prisma.service'
import { IsOptional, IsNumber, IsString, IsIn } from 'class-validator'
import { AiProviderName, DEFAULT_MODELS } from './providers/ai-provider.interface'

class GenererMemTechniqueDto {
  @IsOptional() @IsString() solutionId?: string
}

class GenererOffreFinanciereDto {
  @IsOptional() @IsNumber() margePercent?: number
  @IsOptional() @IsNumber() dureeM?: number
}

class UpdateAiConfigDto {
  @IsIn(['anthropic', 'openrouter', 'groq', 'glm', 'qwen', 'gemini'])
  provider: AiProviderName

  @IsOptional() @IsString() modelHeavy?: string
  @IsOptional() @IsString() modelLight?: string
}

const PROVIDERS_CATALOG = {
  anthropic: {
    label: 'Anthropic Claude',
    description: 'Modèles Claude — meilleure qualité rédactionnelle',
    models: [
      { id: 'claude-opus-4-7',          label: 'Claude Opus 4.7',    tier: 'heavy' },
      { id: 'claude-sonnet-4-6',         label: 'Claude Sonnet 4.6',  tier: 'heavy' },
      { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5',   tier: 'light' },
    ],
  },
  openrouter: {
    label: 'OpenRouter',
    description: 'Accès unifié à 200+ modèles (Llama, Mistral, Gemini...)',
    models: [
      { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B',      tier: 'heavy' },
      { id: 'meta-llama/llama-3.1-8b-instruct',  label: 'Llama 3.1 8B',       tier: 'light' },
      { id: 'mistralai/mistral-large',            label: 'Mistral Large',       tier: 'heavy' },
      { id: 'google/gemini-2.0-flash-001',        label: 'Gemini 2.0 Flash',    tier: 'light' },
      { id: 'deepseek/deepseek-r1',               label: 'DeepSeek R1',         tier: 'heavy' },
      { id: 'qwen/qwen-2.5-72b-instruct',         label: 'Qwen 2.5 72B (OR)',  tier: 'heavy' },
    ],
  },
  groq: {
    label: 'Groq',
    description: 'Inférence ultra-rapide — idéal pour scoring et analyses',
    models: [
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile', tier: 'heavy' },
      { id: 'llama-3.1-8b-instant',    label: 'Llama 3.1 8B Instant',   tier: 'light' },
      { id: 'mixtral-8x7b-32768',      label: 'Mixtral 8x7B',            tier: 'heavy' },
      { id: 'gemma2-9b-it',            label: 'Gemma 2 9B',              tier: 'light' },
    ],
  },
  glm: {
    label: 'GLM (Zhipu AI)',
    description: 'Modèles GLM — bonne compréhension du contexte africain/francophone',
    models: [
      { id: 'glm-4-plus',    label: 'GLM-4 Plus',    tier: 'heavy' },
      { id: 'glm-4-air',     label: 'GLM-4 Air',     tier: 'heavy' },
      { id: 'glm-4-flash',   label: 'GLM-4 Flash',   tier: 'light' },
      { id: 'glm-4-long',    label: 'GLM-4 Long',    tier: 'heavy' },
    ],
  },
  qwen: {
    label: 'Qwen (Alibaba)',
    description: 'Modèles Qwen — multilingue, très compétitif',
    models: [
      { id: 'qwen-max',   label: 'Qwen Max',   tier: 'heavy' },
      { id: 'qwen-plus',  label: 'Qwen Plus',  tier: 'heavy' },
      { id: 'qwen-turbo', label: 'Qwen Turbo', tier: 'light' },
      { id: 'qwen-long',  label: 'Qwen Long',  tier: 'heavy' },
    ],
  },
  gemini: {
    label: 'Google Gemini',
    description: 'Gemini Flash — rapide, multimodal, contexte 1M tokens',
    models: [
      { id: 'gemini-2.0-flash',      label: 'Gemini 2.0 Flash',      tier: 'heavy' },
      { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite', tier: 'light' },
      { id: 'gemini-1.5-pro',        label: 'Gemini 1.5 Pro',        tier: 'heavy' },
      { id: 'gemini-1.5-flash',      label: 'Gemini 1.5 Flash',      tier: 'light' },
    ],
  },
}

@ApiTags('AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(
    private aiService: AiService,
    private prisma: PrismaService,
  ) {}

  // ── Génération ──────────────────────────────────────────────────────────────

  @Post('ao/:aoId/mem-technique')
  @ApiOperation({ summary: 'Générer le mémoire technique d\'un AO' })
  genererMemTechnique(@Request() req: any, @Param('aoId') aoId: string, @Body() dto: GenererMemTechniqueDto) {
    return this.aiService.genererMemTechnique(aoId, req.user.organisationId, dto)
  }

  @Post('ao/:aoId/offre-financiere')
  @ApiOperation({ summary: 'Générer l\'offre financière d\'un AO' })
  genererOffreFinanciere(@Request() req: any, @Param('aoId') aoId: string, @Body() dto: GenererOffreFinanciereDto) {
    return this.aiService.genererOffreFinanciere(aoId, req.user.organisationId, dto)
  }

  @Post('ao/:aoId/resumer')
  @ApiOperation({ summary: 'Résumer un AO (Go/No-Go rapide)' })
  resumer(@Request() req: any, @Param('aoId') aoId: string) {
    return this.aiService.resumerAO(aoId, req.user.organisationId)
  }

  // ── Configuration provider ──────────────────────────────────────────────────

  @Get('providers')
  @ApiOperation({ summary: 'Liste des providers et modèles disponibles' })
  getProviders() {
    return {
      providers: PROVIDERS_CATALOG,
      defaults: DEFAULT_MODELS,
    }
  }

  @Get('config')
  @ApiOperation({ summary: 'Configuration IA active de l\'organisation' })
  async getConfig(@Request() req: any) {
    return this.aiService.getConfiguredProviders(req.user.organisationId)
  }

  @Post('config')
  @ApiOperation({ summary: 'Configurer le provider IA de l\'organisation (ADMIN/MANAGER)' })
  async updateConfig(@Request() req: any, @Body() dto: UpdateAiConfigDto) {
    const defaults = DEFAULT_MODELS[dto.provider]
    await this.prisma.organisation.update({
      where: { id: req.user.organisationId },
      data: {
        aiConfig: {
          provider: dto.provider,
          modelHeavy: dto.modelHeavy ?? defaults.heavy,
          modelLight: dto.modelLight ?? defaults.light,
        },
      },
    })
    return this.aiService.getConfiguredProviders(req.user.organisationId)
  }
}

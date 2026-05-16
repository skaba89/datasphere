import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AnthropicProvider } from './providers/anthropic.provider'
import { OpenAICompatibleProvider } from './providers/openai-compatible.provider'
import { AiProvider, AiProviderName, AiConfig, DEFAULT_MODELS } from './providers/ai-provider.interface'

/** Ordre de préférence pour le fallback automatique */
const FALLBACK_ORDER: AiProviderName[] = ['gemini', 'glm', 'groq', 'openrouter', 'mistral', 'qwen', 'anthropic']

@Injectable()
export class AiProviderFactory {
  private readonly logger = new Logger(AiProviderFactory.name)

  constructor(private config: ConfigService) {}

  /**
   * Retourne un provider configuré pour le modèle "heavy" (mémoire technique, dossiers)
   * ou "light" (résumés, scoring, analyses rapides).
   *
   * Si le provider demandé n'a pas de clé API configurée, on essaie les autres
   * providers dans l'ordre de FALLBACK_ORDER jusqu'à en trouver un fonctionnel.
   */
  getProvider(aiConfig: AiConfig, tier: 'heavy' | 'light'): AiProvider & { model: string } {
    const providerName = aiConfig.provider ?? 'anthropic'
    const model = tier === 'heavy' ? aiConfig.modelHeavy : aiConfig.modelLight

    // Essayer le provider demandé d'abord
    const provider = this.tryBuildProvider(providerName)
    if (provider) {
      return Object.assign(provider, { model })
    }

    // Fallback: essayer les autres providers
    this.logger.warn(`Provider "${providerName}" non configuré (clé API manquante), recherche d'un fallback...`)
    for (const fallbackName of FALLBACK_ORDER) {
      if (fallbackName === providerName) continue
      const fallbackProvider = this.tryBuildProvider(fallbackName)
      if (fallbackProvider) {
        const fallbackDefaults = DEFAULT_MODELS[fallbackName]
        const fallbackModel = tier === 'heavy' ? fallbackDefaults.heavy : fallbackDefaults.light
        this.logger.log(`✅ Fallback IA: utilisation de ${fallbackName} (${fallbackModel}) au lieu de ${providerName}`)
        return Object.assign(fallbackProvider, { model: fallbackModel })
      }
    }

    // Aucun provider disponible
    this.logger.error('❌ Aucun provider IA configuré ! Veuillez ajouter au moins une clé API dans le fichier .env')
    // Retourner un provider qui donnera une erreur claire
    const providerAny = new OpenAICompatibleProvider('none', 'no-key', 'http://localhost:1')
    return Object.assign(providerAny, { model })
  }

  /**
   * Résout la config IA d'une organisation, avec fallback sur les env vars globaux.
   */
  resolveConfig(orgAiConfig: any): AiConfig {
    const provider: AiProviderName = orgAiConfig?.provider ?? this.config.get('AI_DEFAULT_PROVIDER', 'anthropic')
    const defaults = DEFAULT_MODELS[provider] ?? DEFAULT_MODELS.anthropic
    return {
      provider,
      modelHeavy: orgAiConfig?.modelHeavy ?? defaults.heavy,
      modelLight: orgAiConfig?.modelLight ?? defaults.light,
    }
  }

  /**
   * Retourne la liste des providers réellement configurés (avec clé API)
   */
  getAvailableProviders(): { name: AiProviderName; hasKey: boolean }[] {
    return FALLBACK_ORDER.map(name => ({
      name,
      hasKey: !!this.getApiKey(name),
    }))
  }

  /**
   * Tente de construire un provider. Retourne null si la clé API est manquante.
   */
  private tryBuildProvider(name: AiProviderName): AiProvider | null {
    const apiKey = this.getApiKey(name)
    if (!apiKey) return null

    try {
      switch (name) {
        case 'anthropic':
          return new AnthropicProvider(apiKey)
        case 'openrouter':
          return new OpenAICompatibleProvider('openrouter', apiKey, 'https://openrouter.ai/api/v1', {
            'HTTP-Referer': this.config.get('APP_URL', 'https://guineatender.gn'),
            'X-Title': 'GuineaTender AI',
          })
        case 'groq':
          return new OpenAICompatibleProvider('groq', apiKey, 'https://api.groq.com/openai/v1')
        case 'glm':
          return new OpenAICompatibleProvider('glm', apiKey, 'https://open.bigmodel.cn/api/paas/v4')
        case 'qwen':
          return new OpenAICompatibleProvider('qwen', apiKey, 'https://dashscope.aliyuncs.com/compatible-mode/v1')
        case 'gemini':
          return new OpenAICompatibleProvider('gemini', apiKey, 'https://generativelanguage.googleapis.com/v1beta/openai')
        case 'mistral':
          return new OpenAICompatibleProvider('mistral', apiKey, 'https://api.mistral.ai/v1')
        default:
          return null
      }
    } catch (err) {
      this.logger.warn(`Erreur construction provider ${name}: ${err.message}`)
      return null
    }
  }

  private getApiKey(name: AiProviderName): string | undefined {
    const keyMap: Record<AiProviderName, string> = {
      anthropic: 'ANTHROPIC_API_KEY',
      openrouter: 'OPENROUTER_API_KEY',
      groq: 'GROQ_API_KEY',
      glm: 'GLM_API_KEY',
      qwen: 'QWEN_API_KEY',
      gemini: 'GEMINI_API_KEY',
      mistral: 'MISTRAL_API_KEY',
    }
    return this.config.get(keyMap[name])
  }
}

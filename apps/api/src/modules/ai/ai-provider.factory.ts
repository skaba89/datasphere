import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AnthropicProvider } from './providers/anthropic.provider'
import { OpenAICompatibleProvider } from './providers/openai-compatible.provider'
import { AiProvider, AiProviderName, AiConfig, DEFAULT_MODELS } from './providers/ai-provider.interface'

@Injectable()
export class AiProviderFactory {
  private readonly logger = new Logger(AiProviderFactory.name)

  constructor(private config: ConfigService) {}

  /**
   * Retourne un provider configuré pour le modèle "heavy" (mémoire technique, dossiers)
   * ou "light" (résumés, scoring, analyses rapides).
   */
  getProvider(aiConfig: AiConfig, tier: 'heavy' | 'light'): AiProvider & { model: string } {
    const providerName = aiConfig.provider ?? 'anthropic'
    const model = tier === 'heavy' ? aiConfig.modelHeavy : aiConfig.modelLight
    const provider = this.buildProvider(providerName)

    // Attach model to provider for use in generate() via options['model']
    return Object.assign(provider, { model })
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

  private buildProvider(name: AiProviderName): AiProvider {
    switch (name) {
      case 'anthropic':
        return new AnthropicProvider(
          this.config.getOrThrow('ANTHROPIC_API_KEY'),
        )

      case 'openrouter':
        return new OpenAICompatibleProvider(
          'openrouter',
          this.config.getOrThrow('OPENROUTER_API_KEY'),
          'https://openrouter.ai/api/v1',
          {
            'HTTP-Referer': this.config.get('APP_URL', 'https://guineatender.gn'),
            'X-Title': 'GuineaTender AI',
          },
        )

      case 'groq':
        return new OpenAICompatibleProvider(
          'groq',
          this.config.getOrThrow('GROQ_API_KEY'),
          'https://api.groq.com/openai/v1',
        )

      case 'glm':
        return new OpenAICompatibleProvider(
          'glm',
          this.config.getOrThrow('GLM_API_KEY'),
          'https://open.bigmodel.cn/api/paas/v4',
        )

      case 'qwen':
        return new OpenAICompatibleProvider(
          'qwen',
          this.config.getOrThrow('QWEN_API_KEY'),
          'https://dashscope.aliyuncs.com/compatible-mode/v1',
        )

      case 'gemini':
        return new OpenAICompatibleProvider(
          'gemini',
          this.config.getOrThrow('GEMINI_API_KEY'),
          'https://generativelanguage.googleapis.com/v1beta/openai',
        )

      default:
        this.logger.warn(`Provider inconnu "${name}", fallback sur Anthropic`)
        return new AnthropicProvider(
          this.config.get('ANTHROPIC_API_KEY', ''),
        )
    }
  }
}

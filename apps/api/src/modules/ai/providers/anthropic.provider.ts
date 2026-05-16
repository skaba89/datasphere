import Anthropic from '@anthropic-ai/sdk'
import { InternalServerErrorException, Logger } from '@nestjs/common'
import { AiProvider, AiGenerateOptions } from './ai-provider.interface'

export class AnthropicProvider implements AiProvider {
  readonly name = 'anthropic'
  private client: Anthropic
  private readonly logger = new Logger(AnthropicProvider.name)

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey })
  }

  async generate(prompt: string, options: AiGenerateOptions = {}): Promise<string> {
    const model = options.model ?? 'claude-sonnet-4-6'
    const maxTokens = options.maxTokens ?? 4096

    try {
      if (options.systemPrompt) {
        const response = await this.client.messages.create({
          model,
          max_tokens: maxTokens,
          system: options.systemPrompt,
          messages: [{ role: 'user', content: prompt }],
        })
        const content = response.content[0]
        if (content.type !== 'text') throw new InternalServerErrorException('Réponse Anthropic invalide')
        return content.text
      }

      const response = await this.client.messages.create({
        model,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      })

      const content = response.content[0]
      if (content.type !== 'text') throw new InternalServerErrorException('Réponse Anthropic invalide')
      return content.text
    } catch (error: any) {
      const status = error?.status || error?.statusCode
      const errorBody = error?.error?.message
        || error?.message
        || 'erreur inconnue'

      const detail = status
        ? `${status} — anthropic/${model}: ${errorBody}`
        : errorBody

      this.logger.error(`Erreur anthropic (${model}): ${detail}`)

      const enrichedError = new Error(detail)
      ;(enrichedError as any).status = status
      ;(enrichedError as any).provider = 'anthropic'
      ;(enrichedError as any).model = model
      throw enrichedError
    }
  }
}

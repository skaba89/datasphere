import OpenAI from 'openai'
import { InternalServerErrorException, Logger } from '@nestjs/common'
import { AiProvider, AiGenerateOptions } from './ai-provider.interface'

/**
 * Provider générique pour toutes les APIs OpenAI-compatibles :
 * OpenRouter, Groq, GLM (Zhipu), Qwen (DashScope), Gemini, Mistral, etc.
 */
export class OpenAICompatibleProvider implements AiProvider {
  readonly name: string
  private client: OpenAI
  private readonly logger = new Logger(OpenAICompatibleProvider.name)

  constructor(
    name: string,
    apiKey: string,
    baseURL: string,
    private readonly extraHeaders: Record<string, string> = {},
  ) {
    this.name = name
    this.client = new OpenAI({
      apiKey,
      baseURL,
      defaultHeaders: extraHeaders,
    })
  }

  async generate(prompt: string, options: AiGenerateOptions = {}): Promise<string> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = []

    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt })
    }
    messages.push({ role: 'user', content: prompt })

    const model = options.model ?? 'gpt-4o-mini'
    const maxTokens = options.maxTokens ?? 4096
    const temperature = options.temperature ?? 0.7

    try {
      const response = await this.client.chat.completions.create({
        model,
        max_tokens: maxTokens,
        temperature,
        messages,
      })

      const content = response.choices[0]?.message?.content
      if (!content) throw new InternalServerErrorException(`Réponse ${this.name} invalide ou vide`)
      return content
    } catch (error: any) {
      // Enrichir l'erreur avec les détails de la réponse API
      const status = error?.status || error?.statusCode
      const errorBody = error?.error?.message
        || error?.error?.error?.message
        || (typeof error?.error === 'string' ? error.error : null)
        || error?.message
        || 'erreur inconnue'

      const detail = status
        ? `${status} — ${this.name}/${model}: ${errorBody}`
        : errorBody

      this.logger.error(`Erreur ${this.name} (${model}): ${detail}`)

      // Relancer avec un message d'erreur exploitable
      const enrichedError = new Error(detail)
      ;(enrichedError as any).status = status
      ;(enrichedError as any).provider = this.name
      ;(enrichedError as any).model = model
      throw enrichedError
    }
  }
}

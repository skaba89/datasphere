import OpenAI from 'openai'
import { InternalServerErrorException } from '@nestjs/common'
import { AiProvider, AiGenerateOptions } from './ai-provider.interface'

/**
 * Provider générique pour toutes les APIs OpenAI-compatibles :
 * OpenRouter, Groq, GLM (Zhipu), Qwen (DashScope), etc.
 */
export class OpenAICompatibleProvider implements AiProvider {
  readonly name: string
  private client: OpenAI

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

    const response = await this.client.chat.completions.create({
      model: options.model ?? 'gpt-4o-mini',
      max_tokens: options.maxTokens ?? 4096,
      temperature: options.temperature ?? 0.7,
      messages,
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new InternalServerErrorException(`Réponse ${this.name} invalide ou vide`)
    return content
  }
}

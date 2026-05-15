import Anthropic from '@anthropic-ai/sdk'
import { InternalServerErrorException } from '@nestjs/common'
import { AiProvider, AiGenerateOptions } from './ai-provider.interface'

export class AnthropicProvider implements AiProvider {
  readonly name = 'anthropic'
  private client: Anthropic

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey })
  }

  async generate(prompt: string, options: AiGenerateOptions = {}): Promise<string> {
    const model = options.model ?? 'claude-sonnet-4-6'
    const maxTokens = options.maxTokens ?? 4096

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
  }
}

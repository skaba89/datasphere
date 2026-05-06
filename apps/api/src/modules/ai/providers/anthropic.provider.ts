import Anthropic from '@anthropic-ai/sdk'
import { AiProvider, AiGenerateOptions } from './ai-provider.interface'

export class AnthropicProvider implements AiProvider {
  readonly name = 'anthropic'
  private client: Anthropic

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey })
  }

  async generate(prompt: string, options: AiGenerateOptions = {}): Promise<string> {
    const messages: Anthropic.MessageParam[] = []

    if (options.systemPrompt) {
      // Anthropic uses system parameter separately
      const response = await this.client.messages.create({
        model: options['model'] ?? 'claude-sonnet-4-6',
        max_tokens: options.maxTokens ?? 4096,
        system: options.systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      })
      const content = response.content[0]
      if (content.type !== 'text') throw new Error('Réponse Anthropic invalide')
      return content.text
    }

    const response = await this.client.messages.create({
      model: options['model'] ?? 'claude-sonnet-4-6',
      max_tokens: options.maxTokens ?? 4096,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') throw new Error('Réponse Anthropic invalide')
    return content.text
  }
}

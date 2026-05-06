export interface AiGenerateOptions {
  maxTokens?: number
  temperature?: number
  systemPrompt?: string
}

export interface AiProvider {
  readonly name: string
  generate(prompt: string, options?: AiGenerateOptions): Promise<string>
}

export type AiProviderName = 'anthropic' | 'openrouter' | 'groq' | 'glm' | 'qwen' | 'gemini'

export interface AiConfig {
  provider: AiProviderName
  modelHeavy: string   // mémoire technique, dossiers complets
  modelLight: string   // scoring, résumés, analyses rapides
}

export const DEFAULT_MODELS: Record<AiProviderName, { heavy: string; light: string }> = {
  anthropic:   { heavy: 'claude-sonnet-4-6',          light: 'claude-haiku-4-5-20251001' },
  openrouter:  { heavy: 'meta-llama/llama-3.3-70b-instruct', light: 'meta-llama/llama-3.1-8b-instruct' },
  groq:        { heavy: 'llama-3.3-70b-versatile',    light: 'llama-3.1-8b-instant' },
  glm:         { heavy: 'glm-4-plus',                 light: 'glm-4-flash' },
  qwen:        { heavy: 'qwen-max',                   light: 'qwen-turbo' },
  gemini:      { heavy: 'gemini-2.0-flash',           light: 'gemini-2.0-flash-lite' },
}

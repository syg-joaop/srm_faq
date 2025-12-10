import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigService {
  get databaseUrl(): string {
    return process.env.DATABASE_URL || 'postgresql://srm_user:srm_secret_2024@localhost:5432/srm_faq';
  }

  get ollamaUrl(): string {
    return process.env.OLLAMA_URL || 'http://localhost:11434';
  }

  get groqApiKey(): string {
    return process.env.GROQ_API_KEY || '';
  }

  /**
   * Se true, usa GROQ para humanizar respostas por padrão.
   * Se false, retorna apenas a resposta do banco (embedding match) sem LLM.
   * Pode ser sobrescrito por request via parâmetro `humanize`.
   */
  get useGroqHumanize(): boolean {
    const value = process.env.USE_GROQ_HUMANIZE;
    if (value === undefined || value === '') return true; // Default: true
    return value.toLowerCase() === 'true' || value === '1';
  }
}

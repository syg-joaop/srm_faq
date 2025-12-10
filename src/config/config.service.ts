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
}

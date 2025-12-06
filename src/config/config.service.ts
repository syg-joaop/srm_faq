import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigService {
  get databaseUrl(): string {
    return process.env.DATABASE_URL || 'postgresql://srm_user:srm_secret_2024@localhost:5432/srm_faq';
  }

  get ollamaUrl(): string {
    return process.env.OLLAMA_URL || 'http://localhost:11434';
  }

  get embeddingModel(): string {
    return process.env.EMBEDDING_MODEL || 'nomic-embed-text';
  }

  get chatModel(): string {
    return process.env.CHAT_MODEL || 'llama3.2:3b';
  }

  get embeddingDimensions(): number {
    // nomic-embed-text usa 768 dimensões
    return 768;
  }
}

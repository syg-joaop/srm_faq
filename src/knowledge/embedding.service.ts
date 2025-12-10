import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '../config/config.service';

@Injectable()
export class EmbeddingService implements OnModuleInit {
  private baseUrl: string;

  constructor(private config: ConfigService) {
    this.baseUrl = this.config.ollamaUrl;
  }

  async onModuleInit() {
    // Aguardar Ollama estar pronto
    let retries = 10;
    while (retries > 0) {
      try {
        const res = await fetch(`${this.baseUrl}/api/tags`);
        if (res.ok) {
          console.log('✅ Ollama conectado');
          return;
        }
      } catch {}
      retries--;
      await new Promise(r => setTimeout(r, 3000));
    }
    console.warn('⚠️ Ollama não disponível');
  }

  async generate(text: string): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'bge-m3',
        prompt: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Erro embedding: ${response.statusText}`);
    }

    const data = await response.json();
    return data.embedding;
  }
}

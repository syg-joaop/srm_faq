import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '../config/config.service';

interface OllamaEmbeddingResponse {
  embedding: number[];
}

interface OllamaChatResponse {
  message: {
    content: string;
  };
}

@Injectable()
export class OllamaService implements OnModuleInit {
  private baseUrl: string;
  private embeddingModel: string;
  private chatModel: string;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.ollamaUrl;
    this.embeddingModel = this.configService.embeddingModel;
    this.chatModel = this.configService.chatModel;
  }

  async onModuleInit() {
    await this.ensureModelsAvailable();
  }

  private async ensureModelsAvailable(): Promise<void> {
    console.log('🔄 Verificando modelos Ollama...');
    
    try {
      // Verificar modelos instalados
      const response = await fetch(`${this.baseUrl}/api/tags`);
      const data = await response.json();
      const installedModels = data.models?.map((m: any) => m.name) || [];
      
      // Pull dos modelos se necessário
      for (const model of [this.embeddingModel, this.chatModel]) {
        if (!installedModels.some((m: string) => m.startsWith(model.split(':')[0]))) {
          console.log(`📥 Baixando modelo ${model}...`);
          await this.pullModel(model);
        }
      }
      
      console.log('✅ Modelos Ollama prontos');
    } catch (error) {
      console.warn('⚠️ Ollama não disponível, tentando novamente em breve...', error);
    }
  }

  private async pullModel(model: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: model, stream: false }),
    });
    
    if (!response.ok) {
      throw new Error(`Falha ao baixar modelo ${model}`);
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.embeddingModel,
          prompt: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro ao gerar embedding: ${response.statusText}`);
      }

      const data: OllamaEmbeddingResponse = await response.json();
      return data.embedding;
    } catch (error) {
      console.error('Erro ao gerar embedding:', error);
      throw error;
    }
  }

  async humanizeResponse(originalAnswer: string, userQuestion: string): Promise<string> {
    const systemPrompt = `Você é um assistente amigável do sistema SRM. Sua função é:
1. Cumprimentar o usuário de forma breve e natural
2. Fornecer a resposta para a dúvida dele de forma clara e objetiva
3. Se necessário, perguntar se pode ajudar em mais alguma coisa

IMPORTANTE:
- Seja conciso e direto
- Use linguagem amigável e profissional
- Não invente informações além do que está na resposta base
- Responda em português do Brasil`;

    const userPrompt = `Pergunta do usuário: "${userQuestion}"

Resposta base (use estas informações): "${originalAnswer}"

Gere uma resposta humanizada e amigável:`;

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.chatModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro ao gerar resposta: ${response.statusText}`);
      }

      const data: OllamaChatResponse = await response.json();
      return data.message.content;
    } catch (error) {
      console.error('Erro ao humanizar resposta:', error);
      // Fallback: retorna resposta original com saudação simples
      return `Olá! ${originalAnswer}`;
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

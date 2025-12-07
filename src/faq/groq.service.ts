import { Injectable } from '@nestjs/common';
import { ConfigService } from '../config/config.service';

interface GroqChatResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

@Injectable()
export class GroqService {
  private apiKey: string;
  private baseUrl = 'https://api.groq.com/openai/v1';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.groqApiKey;
  }

  async humanizeResponse(originalAnswer: string, userQuestion: string): Promise<string> {
    const systemPrompt = `Você é um assistente amigável do sistema SRM. Sua função é:
1. Cumprimentar o usuário de forma breve e natural
2. Fornecer a resposta para a dúvida dele de forma clara e objetiva
3. Manter a resposta concisa

REGRAS IMPORTANTES:
- Seja conciso e direto (máximo 3 frases)
- Use linguagem amigável e profissional
- NÃO invente informações além do que está na resposta base
- Responda em português do Brasil
- NÃO diga "com base nas informações" ou similar`;

    const userPrompt = `Pergunta do usuário: "${userQuestion}"

Resposta base (use APENAS estas informações): "${originalAnswer}"

Responda de forma natural e amigável:`;

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 300,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Erro Groq:', error);
        throw new Error(`Erro Groq: ${response.statusText}`);
      }

      const data: GroqChatResponse = await response.json();
      return data.choices[0]?.message?.content || `Olá! ${originalAnswer}`;
    } catch (error) {
      console.error('Erro ao humanizar resposta:', error);
      // Fallback: retorna resposta original com saudação simples
      return `Olá! ${originalAnswer}`;
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

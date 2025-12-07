import { Injectable } from '@nestjs/common';
import { ConfigService } from '../config/config.service';

@Injectable()
export class GroqService {
  private apiKey: string;

  constructor(private config: ConfigService) {
    this.apiKey = this.config.groqApiKey;
  }

  async humanize(content: string, userMessage: string): Promise<string> {
    if (!this.apiKey) {
      return `Olá! ${content}`;
    }

    const systemPrompt = `Você é um assistente do sistema SRM. Responda de forma amigável e direta.
REGRAS:
- Máximo 3 frases
- Use APENAS as informações fornecidas
- Português do Brasil
- Não invente nada`;

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Pergunta: "${userMessage}"\n\nInformação para usar: "${content}"\n\nResponda:` },
          ],
          temperature: 0.3,
          max_tokens: 200,
        }),
      });

      if (!response.ok) {
        return `Olá! ${content}`;
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || `Olá! ${content}`;
    } catch {
      return `Olá! ${content}`;
    }
  }
}

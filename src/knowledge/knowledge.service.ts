import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from './database.service';
import { EmbeddingService } from './embedding.service';
import { GroqService } from './groq.service';
import { ConfigService } from '../config/config.service';
import { CreateKnowledgeDto, UpdateKnowledgeDto, KnowledgeEntity, SearchResult } from './knowledge.dto';

@Injectable()
export class KnowledgeService {
  constructor(
    private db: DatabaseService,
    private embedding: EmbeddingService,
    private groq: GroqService,
    private config: ConfigService,
  ) {}

  async create(dto: CreateKnowledgeDto): Promise<KnowledgeEntity> {
    // Gerar título automaticamente se não fornecido
    const title = dto.title || this.generateTitle(dto.content);

    // Gerar embedding do conteúdo
    const vector = await this.embedding.generate(`${title} ${dto.content}`);
    const vectorStr = `[${vector.join(',')}]`;

    const result = await this.db.queryOne<KnowledgeEntity>(
      `INSERT INTO knowledge_base (title, content, category, tags, embedding)
       VALUES ($1, $2, $3, $4, $5::vector)
       RETURNING id, title, content, category, tags, is_active, created_at, updated_at`,
      [title, dto.content, dto.category || null, dto.tags || null, vectorStr],
    );

    return result!;
  }

  private generateTitle(content: string): string {
    // Pegar as primeiras palavras significativas do conteúdo
    const cleaned = content
      .replace(/[#*_\-]/g, '') // Remove markdown
      .replace(/\s+/g, ' ') // Normaliza espaços
      .trim();

    // Pegar primeira frase ou primeiras 50 caracteres
    const firstSentence = cleaned.split(/[.!?\n]/)[0].trim();

    if (firstSentence.length <= 60) {
      return firstSentence;
    }

    // Cortar na última palavra completa antes de 60 caracteres
    const truncated = firstSentence.substring(0, 60);
    const lastSpace = truncated.lastIndexOf(' ');
    return (lastSpace > 30 ? truncated.substring(0, lastSpace) : truncated) + '...';
  }

  async findAll(includeInactive = false): Promise<KnowledgeEntity[]> {
    const where = includeInactive ? '' : 'WHERE is_active = true';
    return this.db.query<KnowledgeEntity>(
      `SELECT id, title, content, category, tags, is_active, created_at, updated_at
       FROM knowledge_base ${where} ORDER BY created_at DESC`,
    );
  }

  async findOne(id: number): Promise<KnowledgeEntity | null> {
    return this.db.queryOne<KnowledgeEntity>(
      `SELECT id, title, content, category, tags, is_active, created_at, updated_at
       FROM knowledge_base WHERE id = $1`,
      [id],
    );
  }

  async update(id: number, dto: UpdateKnowledgeDto): Promise<KnowledgeEntity | null> {
    const existing = await this.findOne(id);
    if (!existing) return null;

    const params: any[] = [];
    const updates: string[] = [];
    let i = 1;

    if (dto.title !== undefined) { updates.push(`title = $${i++}`); params.push(dto.title); }
    if (dto.content !== undefined) { updates.push(`content = $${i++}`); params.push(dto.content); }
    if (dto.category !== undefined) { updates.push(`category = $${i++}`); params.push(dto.category); }
    if (dto.tags !== undefined) { updates.push(`tags = $${i++}`); params.push(dto.tags); }
    if (dto.is_active !== undefined) { updates.push(`is_active = $${i++}`); params.push(dto.is_active); }

    // Regerar embedding se conteúdo mudou
    if (dto.title !== undefined || dto.content !== undefined) {
      const newTitle = dto.title ?? existing.title;
      const newContent = dto.content ?? existing.content;
      const vector = await this.embedding.generate(`${newTitle} ${newContent}`);
      updates.push(`embedding = $${i++}::vector`);
      params.push(`[${vector.join(',')}]`);
    }

    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) return existing;

    params.push(id);
    return this.db.queryOne<KnowledgeEntity>(
      `UPDATE knowledge_base SET ${updates.join(', ')} WHERE id = $${i} 
       RETURNING id, title, content, category, tags, is_active, created_at, updated_at`,
      params,
    );
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.db.query('DELETE FROM knowledge_base WHERE id = $1 RETURNING id', [id]);
    return result.length > 0;
  }

  async search(query: string, threshold = 0.35): Promise<SearchResult[]> {
    const vector = await this.embedding.generate(query);
    const vectorStr = `[${vector.join(',')}]`;

    return this.db.query<SearchResult>(
      `SELECT * FROM search_knowledge($1::vector, $2, 5)`,
      [vectorStr, threshold],
    );
  }

  /**
   * @param message - Mensagem do usuário
   * @param sessionId - ID da sessão (opcional)
   * @param humanize - Se deve usar LLM para humanizar (undefined = usa config ENV)
   */
  async chat(message: string, sessionId?: string, humanize?: boolean) {
    const sid = sessionId || uuidv4();

    // Determina se deve humanizar: parâmetro > ENV > default true
    const shouldHumanize = humanize !== undefined ? humanize : this.config.useGroqHumanize;

    // Buscar conhecimento relevante (threshold baixo para melhor recall)
    const results = await this.search(message, 0.35);
    const hasMatch = results.length > 0 && results[0].similarity >= 0.35;

    let answer: string;

    if (!hasMatch) {
      answer = 'Sou o assistente do SRM e posso ajudar apenas com dúvidas sobre o sistema.\n\n' +
               'Exemplos do que posso responder:\n' +
               '- Como redefinir senha\n' +
               '- Formas de pagamento\n' +
               '- Funcionalidades do sistema\n\n' +
               'Como posso ajudar?';
    } else if (shouldHumanize) {
      // Humanizar resposta via Groq
      answer = await this.groq.humanize(results[0].content, message);
    } else {
      // Retorna resposta direta do banco (embedding match)
      answer = results[0].content;
    }

    // Logar
    await this.db.query(
      `INSERT INTO chat_logs (session_id, user_message, matched_knowledge_id, bot_response, similarity_score)
       VALUES ($1, $2, $3, $4, $5)`,
      [sid, message, results[0]?.id || null, answer, results[0]?.similarity || 0],
    );

    return { answer, sources: hasMatch ? results : [], sessionId: sid, humanized: shouldHumanize };
  }

  async getStats() {
    const [stats] = await this.db.query<any>(`
      SELECT 
        (SELECT COUNT(*) FROM knowledge_base)::int as total,
        (SELECT COUNT(*) FROM knowledge_base WHERE is_active = true)::int as active,
        (SELECT COUNT(*) FROM chat_logs)::int as chats,
        (SELECT COUNT(DISTINCT category) FROM knowledge_base WHERE category IS NOT NULL)::int as categories
    `);
    return stats;
  }
}

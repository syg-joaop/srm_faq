import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from './database.service';
import { OllamaService } from './ollama.service';
import {
  CreateFaqDto,
  UpdateFaqDto,
  FaqEntity,
  SearchResult,
  ChatResponse,
} from './faq.dto';

@Injectable()
export class FaqService {
  constructor(
    private databaseService: DatabaseService,
    private ollamaService: OllamaService,
  ) {}

  async create(dto: CreateFaqDto): Promise<FaqEntity> {
    // Gerar embedding da pergunta + resposta para melhor matching
    const textToEmbed = `${dto.question} ${dto.answer}`;
    const embedding = await this.ollamaService.generateEmbedding(textToEmbed);
    const embeddingStr = `[${embedding.join(',')}]`;

    const result = await this.databaseService.queryOne<FaqEntity>(
      `INSERT INTO faqs (question, answer, category, tags, embedding)
       VALUES ($1, $2, $3, $4, $5::vector)
       RETURNING id, question, answer, category, tags, is_active, created_at, updated_at`,
      [dto.question, dto.answer, dto.category || null, dto.tags || null, embeddingStr],
    );

    return result!;
  }

  async findAll(includeInactive = false): Promise<FaqEntity[]> {
    const whereClause = includeInactive ? '' : 'WHERE is_active = true';
    return this.databaseService.query<FaqEntity>(
      `SELECT id, question, answer, category, tags, is_active, created_at, updated_at
       FROM faqs ${whereClause}
       ORDER BY created_at DESC`,
    );
  }

  async findOne(id: number): Promise<FaqEntity | null> {
    return this.databaseService.queryOne<FaqEntity>(
      `SELECT id, question, answer, category, tags, is_active, created_at, updated_at
       FROM faqs WHERE id = $1`,
      [id],
    );
  }

  async update(id: number, dto: UpdateFaqDto): Promise<FaqEntity | null> {
    const existing = await this.findOne(id);
    if (!existing) return null;

    // Se pergunta ou resposta mudou, regerar embedding
    let embeddingUpdate = '';
    const params: any[] = [];
    let paramIndex = 1;

    const updates: string[] = [];

    if (dto.question !== undefined) {
      updates.push(`question = $${paramIndex++}`);
      params.push(dto.question);
    }
    if (dto.answer !== undefined) {
      updates.push(`answer = $${paramIndex++}`);
      params.push(dto.answer);
    }
    if (dto.category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      params.push(dto.category);
    }
    if (dto.tags !== undefined) {
      updates.push(`tags = $${paramIndex++}`);
      params.push(dto.tags);
    }
    if (dto.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      params.push(dto.is_active);
    }

    // Regerar embedding se texto mudou
    if (dto.question !== undefined || dto.answer !== undefined) {
      const newQuestion = dto.question ?? existing.question;
      const newAnswer = dto.answer ?? existing.answer;
      const textToEmbed = `${newQuestion} ${newAnswer}`;
      const embedding = await this.ollamaService.generateEmbedding(textToEmbed);
      const embeddingStr = `[${embedding.join(',')}]`;
      updates.push(`embedding = $${paramIndex++}::vector`);
      params.push(embeddingStr);
    }

    if (updates.length === 0) return existing;

    params.push(id);
    const result = await this.databaseService.queryOne<FaqEntity>(
      `UPDATE faqs SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, question, answer, category, tags, is_active, created_at, updated_at`,
      params,
    );

    return result;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.databaseService.query(
      'DELETE FROM faqs WHERE id = $1 RETURNING id',
      [id],
    );
    return result.length > 0;
  }

  async search(
    query: string,
    threshold = 0.5,
    limit = 5,
  ): Promise<SearchResult[]> {
    // Gerar embedding da query
    const queryEmbedding = await this.ollamaService.generateEmbedding(query);
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    // Buscar FAQs similares usando a função do banco
    const results = await this.databaseService.query<SearchResult>(
      `SELECT * FROM search_similar_faqs($1::vector, $2, $3)`,
      [embeddingStr, threshold, limit],
    );

    return results;
  }

  async chat(message: string, sessionId?: string): Promise<ChatResponse> {
    const resolvedSessionId = sessionId || uuidv4();

    // Buscar FAQs relevantes
    const searchResults = await this.search(message, 0.5, 3);

    let answer: string;

    if (searchResults.length === 0) {
      answer = 'Olá! Desculpe, não encontrei uma resposta específica para sua pergunta. ' +
               'Você poderia reformular sua dúvida ou entrar em contato com nosso suporte ' +
               'para uma assistência mais personalizada?';
    } else {
      // Usar a melhor resposta encontrada
      const bestMatch = searchResults[0];
      answer = await this.ollamaService.humanizeResponse(
        bestMatch.answer,
        message,
      );
    }

    // Logar a conversa
    await this.logConversation(
      resolvedSessionId,
      message,
      searchResults[0]?.id || null,
      answer,
      searchResults[0]?.similarity || 0,
    );

    return {
      answer,
      sources: searchResults,
      sessionId: resolvedSessionId,
    };
  }

  private async logConversation(
    sessionId: string,
    question: string,
    faqId: number | null,
    response: string,
    similarity: number,
  ): Promise<void> {
    await this.databaseService.query(
      `INSERT INTO conversation_logs (session_id, user_question, matched_faq_id, ai_response, similarity_score)
       VALUES ($1, $2, $3, $4, $5)`,
      [sessionId, question, faqId, response, similarity],
    );
  }

  async getCategories(): Promise<string[]> {
    const results = await this.databaseService.query<{ category: string }>(
      `SELECT DISTINCT category FROM faqs WHERE category IS NOT NULL AND is_active = true ORDER BY category`,
    );
    return results.map((r) => r.category);
  }

  async getStats(): Promise<{
    totalFaqs: number;
    activeFaqs: number;
    totalConversations: number;
    categories: number;
  }> {
    const [stats] = await this.databaseService.query<{
      total_faqs: string;
      active_faqs: string;
      total_conversations: string;
      categories: string;
    }>(`
      SELECT 
        (SELECT COUNT(*) FROM faqs)::text as total_faqs,
        (SELECT COUNT(*) FROM faqs WHERE is_active = true)::text as active_faqs,
        (SELECT COUNT(*) FROM conversation_logs)::text as total_conversations,
        (SELECT COUNT(DISTINCT category) FROM faqs WHERE category IS NOT NULL)::text as categories
    `);

    return {
      totalFaqs: parseInt(stats.total_faqs),
      activeFaqs: parseInt(stats.active_faqs),
      totalConversations: parseInt(stats.total_conversations),
      categories: parseInt(stats.categories),
    };
  }
}

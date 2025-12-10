import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';

// Cadastrar conteúdo (título é gerado automaticamente se não fornecido)
export class CreateKnowledgeDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateKnowledgeDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class ChatDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsBoolean()
  humanize?: boolean;
}

export interface KnowledgeEntity {
  id: number;
  title: string;
  content: string;
  category: string | null;
  tags: string[] | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface SearchResult {
  id: number;
  title: string;
  content: string;
  category: string | null;
  tags: string[] | null;
  similarity: number;
}

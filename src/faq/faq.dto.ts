import { IsString, IsOptional, IsArray, IsBoolean, IsNumber, Min, Max } from 'class-validator';

export class CreateFaqDto {
  @IsString()
  question: string;

  @IsString()
  answer: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateFaqDto {
  @IsOptional()
  @IsString()
  question?: string;

  @IsOptional()
  @IsString()
  answer?: string;

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

export class SearchFaqDto {
  @IsString()
  query: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  threshold?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  limit?: number;

  @IsOptional()
  @IsBoolean()
  humanize?: boolean;
}

export class ChatDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  sessionId?: string;
}

export interface FaqEntity {
  id: number;
  question: string;
  answer: string;
  category: string | null;
  tags: string[] | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface SearchResult {
  id: number;
  question: string;
  answer: string;
  category: string | null;
  tags: string[] | null;
  similarity: number;
}

export interface ChatResponse {
  answer: string;
  sources: SearchResult[];
  sessionId: string;
}

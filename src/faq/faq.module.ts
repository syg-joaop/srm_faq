import { Module } from '@nestjs/common';
import { FaqController } from './faq.controller';
import { FaqService } from './faq.service';
import { DatabaseService } from './database.service';
import { OllamaService } from './ollama.service';
import { GroqService } from './groq.service';

@Module({
  controllers: [FaqController],
  providers: [FaqService, DatabaseService, OllamaService, GroqService],
  exports: [FaqService],
})
export class FaqModule {}

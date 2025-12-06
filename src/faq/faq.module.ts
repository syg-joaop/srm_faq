import { Module } from '@nestjs/common';
import { FaqController } from './faq.controller';
import { FaqService } from './faq.service';
import { DatabaseService } from './database.service';
import { OllamaService } from './ollama.service';

@Module({
  controllers: [FaqController],
  providers: [FaqService, DatabaseService, OllamaService],
  exports: [FaqService],
})
export class FaqModule {}

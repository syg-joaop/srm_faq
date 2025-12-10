import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, ParseIntPipe,
  HttpException, HttpStatus,
} from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';
import { CreateKnowledgeDto, UpdateKnowledgeDto, ChatDto } from './knowledge.dto';

@Controller('knowledge')
export class KnowledgeController {
  constructor(private readonly service: KnowledgeService) {}

  @Post()
  async create(@Body() dto: CreateKnowledgeDto) {
    try {
      const item = await this.service.create(dto);
      return { success: true, data: item };
    } catch (error) {
      throw new HttpException({ success: false, message: error.message }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get()
  async findAll(@Query('includeInactive') includeInactive?: string) {
    const items = await this.service.findAll(includeInactive === 'true');
    return { success: true, data: items, total: items.length };
  }

  @Get('stats')
  async getStats() {
    const stats = await this.service.getStats();
    return { success: true, data: stats };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const item = await this.service.findOne(id);
    if (!item) throw new HttpException({ success: false, message: 'Não encontrado' }, HttpStatus.NOT_FOUND);
    return { success: true, data: item };
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateKnowledgeDto) {
    try {
      const item = await this.service.update(id, dto);
      if (!item) throw new HttpException({ success: false, message: 'Não encontrado' }, HttpStatus.NOT_FOUND);
      return { success: true, data: item };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException({ success: false, message: error.message }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    const deleted = await this.service.delete(id);
    if (!deleted) throw new HttpException({ success: false, message: 'Não encontrado' }, HttpStatus.NOT_FOUND);
    return { success: true };
  }

  @Post('search')
  async search(@Body() body: { query: string; threshold?: number }) {
    try {
      const results = await this.service.search(body.query, body.threshold ?? 0.6);
      return { success: true, data: results };
    } catch (error) {
      throw new HttpException({ success: false, message: error.message }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('chat')
  async chat(@Body() dto: ChatDto) {
    try {
      const response = await this.service.chat(dto.message, dto.sessionId);
      return { success: true, data: response };
    } catch (error) {
      throw new HttpException({ success: false, message: error.message }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

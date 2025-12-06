import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FaqService } from './faq.service';
import { CreateFaqDto, UpdateFaqDto, SearchFaqDto, ChatDto } from './faq.dto';

@Controller('faq')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  // ============ CRUD ============

  @Post()
  async create(@Body() dto: CreateFaqDto) {
    try {
      const faq = await this.faqService.create(dto);
      return {
        success: true,
        data: faq,
        message: 'FAQ criada com sucesso',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: `Erro ao criar FAQ: ${error.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  async findAll(@Query('includeInactive') includeInactive?: string) {
    const faqs = await this.faqService.findAll(includeInactive === 'true');
    return {
      success: true,
      data: faqs,
      total: faqs.length,
    };
  }

  @Get('stats')
  async getStats() {
    const stats = await this.faqService.getStats();
    return {
      success: true,
      data: stats,
    };
  }

  @Get('categories')
  async getCategories() {
    const categories = await this.faqService.getCategories();
    return {
      success: true,
      data: categories,
    };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const faq = await this.faqService.findOne(id);
    if (!faq) {
      throw new HttpException(
        {
          success: false,
          message: 'FAQ não encontrada',
        },
        HttpStatus.NOT_FOUND,
      );
    }
    return {
      success: true,
      data: faq,
    };
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFaqDto,
  ) {
    try {
      const faq = await this.faqService.update(id, dto);
      if (!faq) {
        throw new HttpException(
          {
            success: false,
            message: 'FAQ não encontrada',
          },
          HttpStatus.NOT_FOUND,
        );
      }
      return {
        success: true,
        data: faq,
        message: 'FAQ atualizada com sucesso',
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          success: false,
          message: `Erro ao atualizar FAQ: ${error.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    const deleted = await this.faqService.delete(id);
    if (!deleted) {
      throw new HttpException(
        {
          success: false,
          message: 'FAQ não encontrada',
        },
        HttpStatus.NOT_FOUND,
      );
    }
    return {
      success: true,
      message: 'FAQ deletada com sucesso',
    };
  }

  // ============ BUSCA SEMÂNTICA ============

  @Post('search')
  async search(@Body() dto: SearchFaqDto) {
    try {
      const results = await this.faqService.search(
        dto.query,
        dto.threshold ?? 0.5,
        dto.limit ?? 5,
      );
      return {
        success: true,
        data: results,
        total: results.length,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: `Erro na busca: ${error.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============ CHAT COM IA ============

  @Post('chat')
  async chat(@Body() dto: ChatDto) {
    try {
      const response = await this.faqService.chat(dto.message, dto.sessionId);
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: `Erro no chat: ${error.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

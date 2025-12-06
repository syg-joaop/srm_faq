import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { FaqModule } from './faq/faq.module';
import { ConfigModule } from './config/config.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    // Servir arquivos estáticos (admin panel)
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/',
    }),
    ConfigModule,
    FaqModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

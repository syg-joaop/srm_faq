import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Habilitar CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  
  // Validação global
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));
  
  // Prefixo global para API
  app.setGlobalPrefix('api', {
    exclude: ['/', '/admin', '/admin/(.*)', '/health'],
  });
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`🚀 SRM FAQ API rodando em http://localhost:${port}`);
  console.log(`📝 Admin Panel: http://localhost:${port}/admin`);
  console.log(`❤️  Health Check: http://localhost:${port}/health`);
}

bootstrap();

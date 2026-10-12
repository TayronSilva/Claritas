import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const isProd = config.get<string>('NODE_ENV') === 'production';
  const swaggerEnabled = config.get<string>('SWAGGER_ENABLED')
    ? config.get<string>('SWAGGER_ENABLED') === 'true'
    : !isProd;

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  const origins = config
    .get<string>('CORS_ORIGINS', '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: origins.length ? origins : !isProd,
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  if (swaggerEnabled) {
    const swagger = new DocumentBuilder()
      .setTitle('Claritas API')
      .setDescription(
        'Infraestrutura de arrecadacao e permanencia estudantil. ' +
          'Blockchain como camada de auditoria; produto e o fundo de permanencia.',
      )
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swagger);
    SwaggerModule.setup('docs', app, document);
  }

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);

  new Logger('Bootstrap').log(`API em http://localhost:${port}/api/v1`);
  if (swaggerEnabled) {
    new Logger('Bootstrap').log(`Swagger em http://localhost:${port}/docs`);
  }
}

bootstrap();

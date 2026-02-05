import './tracing'; // Must be first import for OpenTelemetry instrumentation
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const logger = app.get(Logger);

  app.useLogger(logger);

  app.use(helmet());

  app.enableCors({
    origin: configService.get<string>('cors.origin') || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Request-ID'],
    credentials: true,
    maxAge: 86400,
  });

  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: configService.get<string>('environment') === 'production',
      validateCustomDecorators: true,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter(app.get(Logger)));

  const port = configService.get<number>('port') || 3000;

  await app.listen(port);

  logger.log(`🚀 Application started successfully`, 'Bootstrap');
  logger.log(`Server running on: http://localhost:${port}`, 'Bootstrap');
  logger.log(`API Base URL: http://localhost:${port}/api/v1`, 'Bootstrap');
}

void bootstrap();

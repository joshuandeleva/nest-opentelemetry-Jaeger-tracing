import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { trace } from '@opentelemetry/api';

interface SerializedRequest {
  id: string;
  method: string;
  url: string;
}

interface SerializedResponse {
  statusCode: number;
}

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isDevelopment = configService.get<string>('environment') === 'development';
        const logLevel = configService.get<string>('logging.level');
        const usePretty = configService.get<boolean>('logging.pretty');

        return {
          pinoHttp: {
            level: logLevel || 'info',
            transport:
              isDevelopment && usePretty
                ? {
                    target: 'pino-pretty',
                    options: {
                      colorize: true,
                      translateTime: 'HH:MM:ss Z',
                      ignore: 'pid,hostname',
                      singleLine: false,
                    },
                  }
                : undefined,
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers["x-api-key"]',
                'phoneNumber',
                '*.phoneNumber',
                'req.body.phoneNumber',
                'res.body.phoneNumber',
              ],
              censor: '[REDACTED]',
            },
            serializers: {
              req: (req: SerializedRequest) => ({
                id: req.id,
                method: req.method,
                url: req.url,
              }),
              res: (res: SerializedResponse) => ({
                statusCode: res.statusCode,
              }),
            },
            autoLogging: true,
            customLogLevel: (_req, res, err) => {
              if (res.statusCode >= 500 || err) return 'error';
              if (res.statusCode >= 400) return 'warn';
              return 'info';
            },
            mixin: () => {
              const span = trace.getActiveSpan();
              if (span) {
                const { traceId, spanId } = span.spanContext();
                return { trace_id: traceId, span_id: spanId };
              }
              return {};
            },
          },
        };
      },
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}

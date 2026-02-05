import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Inject } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { PinoLogger } from 'nestjs-pino';
import { Request, Response } from 'express';

interface CachedResponse {
  statusCode: number;
  body: unknown;
  timestamp: string;
}

interface RequestWithIdempotency extends Request {
  idempotencyKey?: string;
}

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly prefix = 'idempotency:';

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(IdempotencyInterceptor.name);
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<RequestWithIdempotency>();
    const response = context.switchToHttp().getResponse<Response>();

    const idempotencyKey = request.idempotencyKey;

    if (!idempotencyKey) {
      return next.handle();
    }

    this.logger.info(
      {
        idempotencyKey,
        method: request.method,
        url: request.url,
      },
      'Processing request with idempotency key',
    );

    const cacheKey = `${this.prefix}${idempotencyKey}`;

    const cached = await this.redis.get(cacheKey);

    if (cached) {
      const cachedResponse = JSON.parse(cached) as CachedResponse;
      this.logger.info(
        { idempotencyKey, cachedAt: cachedResponse.timestamp },
        'Returning cached response for idempotency key',
      );

      response.status(cachedResponse.statusCode);

      return of(cachedResponse.body);
    }

    return next.handle().pipe(
      tap((responseBody: unknown) => {
        const ttl = this.configService.get<number>('idempotency.ttl') || 86400;
        const statusCode = response.statusCode;

        const cacheValue: CachedResponse = {
          statusCode,
          body: responseBody,
          timestamp: new Date().toISOString(),
        };

        this.redis
          .setex(cacheKey, ttl, JSON.stringify(cacheValue))
          .then(() => {
            this.logger.debug({ idempotencyKey, ttl }, 'Cached response for idempotency key');
          })
          .catch((error: Error) => {
            this.logger.error(
              { idempotencyKey, error: error.message },
              'Failed to cache idempotency response',
            );
          });
      }),
    );
  }
}

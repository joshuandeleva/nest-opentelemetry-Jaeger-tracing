import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { validate as isUUID } from 'uuid';
import {
  MissingIdempotencyKeyException,
  InvalidIdempotencyKeyException,
} from '../../payments/exceptions/idempotency.exception';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface RequestWithIdempotencyKey extends Request {
  idempotencyKey?: string;
}

@Injectable()
export class IdempotencyKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithIdempotencyKey>();
    const headerName = this.configService.get<string>('idempotency.header') || 'Idempotency-Key';

    const idempotencyKey = request.headers[headerName.toLowerCase()] as string;

    if (!idempotencyKey) {
      throw new MissingIdempotencyKeyException(
        `${headerName} header is required for this endpoint`,
      );
    }

    if (!isUUID(idempotencyKey)) {
      throw new InvalidIdempotencyKeyException(`${headerName} must be a valid UUID`);
    }

    if (!UUID_V4_REGEX.test(idempotencyKey)) {
      throw new InvalidIdempotencyKeyException(`${headerName} must be a valid UUID v4`);
    }

    request.idempotencyKey = idempotencyKey;

    return true;
  }
}

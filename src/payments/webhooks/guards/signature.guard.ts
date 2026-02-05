import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import * as crypto from 'crypto';
import { Request } from 'express';
import {
  InvalidSignatureException,
  ReplayAttackException,
} from '../../exceptions/webhook.exception';

@Injectable()
export class SignatureGuard implements CanActivate {
  private readonly webhookSecret: string;
  private readonly maxAgeMs = 5 * 60 * 1000;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(SignatureGuard.name);
    this.webhookSecret = this.configService.get<string>('sasapay.webhookSecret') || '';
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    const signature =
      request.headers['x-sasapay-signature'] ||
      request.headers['x-signature'] ||
      (request.headers['signature'] as string | undefined);

    if (!signature) {
      this.logger.warn('Missing webhook signature');
      throw new InvalidSignatureException('Missing webhook signature');
    }

    const payload = JSON.stringify(request.body);
    if (!this.verifySignature(payload, signature as string)) {
      this.logger.warn({ signature }, 'Invalid webhook signature');
      throw new InvalidSignatureException('Invalid webhook signature');
    }

    const body = request.body as Record<string, unknown> | undefined;
    const timestamp = body?.timestamp ?? body?.Timestamp;
    if (timestamp && !this.isTimestampValid(timestamp as string | number)) {
      this.logger.warn({ timestamp }, 'Webhook timestamp too old');
      throw new ReplayAttackException('Webhook timestamp is too old');
    }

    this.logger.debug('Webhook signature verified successfully');
    return true;
  }

  private verifySignature(payload: string, signature: string): boolean {
    if (!this.webhookSecret) {
      this.logger.warn('Webhook secret not configured, skipping verification');
      return true;
    }

    const computedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(Buffer.from(computedSignature), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  private isTimestampValid(timestamp: string | number): boolean {
    const webhookTime = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;

    const now = Date.now();
    const age = now - webhookTime;

    return age >= 0 && age < this.maxAgeMs;
  }
}

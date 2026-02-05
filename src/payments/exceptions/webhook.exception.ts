import { HttpStatus } from '@nestjs/common';
import { BasePaymentException } from './payment.exception';

export class WebhookException extends BasePaymentException {
  constructor(message = 'Webhook validation failed') {
    super(message, HttpStatus.BAD_REQUEST, 'WEBHOOK_ERROR');
  }
}

export class InvalidSignatureException extends BasePaymentException {
  constructor(message = 'Invalid webhook signature') {
    super(message, HttpStatus.UNAUTHORIZED, 'INVALID_SIGNATURE');
  }
}

export class ReplayAttackException extends BasePaymentException {
  constructor(message = 'Webhook timestamp is too old (replay attack detected)') {
    super(message, HttpStatus.BAD_REQUEST, 'REPLAY_ATTACK');
  }
}

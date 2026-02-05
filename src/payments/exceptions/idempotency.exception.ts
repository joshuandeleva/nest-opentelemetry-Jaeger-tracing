import { HttpStatus } from '@nestjs/common';
import { BasePaymentException } from './payment.exception';

export class IdempotencyException extends BasePaymentException {
  constructor(message = 'Idempotency key error') {
    super(message, HttpStatus.BAD_REQUEST, 'IDEMPOTENCY_ERROR');
  }
}

export class MissingIdempotencyKeyException extends BasePaymentException {
  constructor(message = 'Idempotency-Key header is required') {
    super(message, HttpStatus.BAD_REQUEST, 'MISSING_IDEMPOTENCY_KEY');
  }
}

export class InvalidIdempotencyKeyException extends BasePaymentException {
  constructor(message = 'Invalid idempotency key format (expected UUID v4)') {
    super(message, HttpStatus.BAD_REQUEST, 'INVALID_IDEMPOTENCY_KEY');
  }
}

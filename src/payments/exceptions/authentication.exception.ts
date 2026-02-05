import { HttpStatus } from '@nestjs/common';
import { BasePaymentException } from './payment.exception';

export class AuthenticationException extends BasePaymentException {
  constructor(message = 'Authentication failed') {
    super(message, HttpStatus.UNAUTHORIZED, 'AUTHENTICATION_FAILED');
  }
}

export class InvalidCredentialsException extends BasePaymentException {
  constructor(message = 'Invalid credentials provided') {
    super(message, HttpStatus.UNAUTHORIZED, 'INVALID_CREDENTIALS');
  }
}

export class TokenExpiredException extends BasePaymentException {
  constructor(message = 'Access token has expired') {
    super(message, HttpStatus.UNAUTHORIZED, 'TOKEN_EXPIRED');
  }
}

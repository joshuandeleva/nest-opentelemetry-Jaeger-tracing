import { HttpException, HttpStatus } from '@nestjs/common';

export class BasePaymentException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly errorCode?: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(
      {
        statusCode,
        message,
        errorCode,
        details,
        timestamp: new Date().toISOString(),
      },
      statusCode,
    );
  }
}

export class InsufficientFundsException extends BasePaymentException {
  constructor(message = 'Insufficient funds') {
    super(message, HttpStatus.PAYMENT_REQUIRED, 'INSUFFICIENT_FUNDS');
  }
}

export class InvalidPhoneNumberException extends BasePaymentException {
  constructor(message = 'Invalid phone number format') {
    super(message, HttpStatus.BAD_REQUEST, 'INVALID_PHONE_NUMBER');
  }
}

export class DuplicateTransactionException extends BasePaymentException {
  constructor(message = 'Duplicate transaction detected') {
    super(message, HttpStatus.CONFLICT, 'DUPLICATE_TRANSACTION');
  }
}

export class PaymentTimeoutException extends BasePaymentException {
  constructor(message = 'Payment request timed out') {
    super(message, HttpStatus.REQUEST_TIMEOUT, 'PAYMENT_TIMEOUT');
  }
}

export class TransactionNotFoundException extends BasePaymentException {
  constructor(message = 'Transaction not found') {
    super(message, HttpStatus.NOT_FOUND, 'TRANSACTION_NOT_FOUND');
  }
}

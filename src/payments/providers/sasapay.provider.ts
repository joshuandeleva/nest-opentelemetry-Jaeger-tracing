import { Injectable, HttpException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { HttpService } from './http/http.service';
import {
  RequestMapper,
  C2BPaymentRequest,
  B2CPaymentRequest,
  B2BPaymentRequest,
  TransactionStatusRequest,
} from './mappers/request.mapper';
import {
  ResponseMapper,
  PaymentResponse,
  BalanceResponse,
  TransactionStatusResponse,
} from './mappers/response.mapper';
import {
  SasaPayC2BResponseDto,
  SasaPayB2CResponseDto,
  SasaPayB2BResponseDto,
  SasaPayBalanceResponseDto,
  SasaPayTransactionStatusResponseDto,
} from './dto/sasapay.dto';
import { BasePaymentException } from '../exceptions/payment.exception';

const ENDPOINTS = {
  C2B_REQUEST_PAYMENT: '/payments/request-payment/',
  B2C_SEND_MONEY: '/payments/b2c/',
  B2B_TRANSFER: '/payments/b2b/',
  BALANCE: '/payments/check-balance/',
  TRANSACTION_STATUS: '/transactions/status-query/',
};

@Injectable()
export class SasaPayProvider {
  constructor(
    private readonly httpService: HttpService,
    private readonly requestMapper: RequestMapper,
    private readonly responseMapper: ResponseMapper,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(SasaPayProvider.name);
  }

  async requestC2BPayment(request: C2BPaymentRequest): Promise<PaymentResponse> {
    this.logger.info(
      {
        phoneNumber: this.maskPhoneNumber(request.phoneNumber),
        amount: request.amount,
        accountReference: request.accountReference,
      },
      'Initiating C2B payment request',
    );

    const sasaPayRequest = this.requestMapper.mapC2BRequest(request);

    this.logger.info(
      {
        endpoint: ENDPOINTS.C2B_REQUEST_PAYMENT,
        request: {
          ...sasaPayRequest,
          PhoneNumber: this.maskPhoneNumber(sasaPayRequest.PhoneNumber),
        },
      },
      'Sending C2B request to SasaPay',
    );

    try {
      const response = await this.httpService.post<SasaPayC2BResponseDto>(
        ENDPOINTS.C2B_REQUEST_PAYMENT,
        sasaPayRequest,
      );

      this.logger.info(
        {
          status: response.status,
          responseData: response,
        },
        'Received response from SasaPay for C2B payment request',
      );

      const mappedResponse = this.responseMapper.mapC2BResponse(response);

      this.logger.info(
        {
          success: mappedResponse.success,
          merchantRequestId: mappedResponse.merchantRequestId,
          checkoutRequestId: mappedResponse.checkoutRequestId,
        },
        'C2B payment request completed',
      );

      return mappedResponse;
    } catch (error) {
      this.handleProviderError(error, 'C2B payment request');
    }
  }

  async sendB2CPayment(request: B2CPaymentRequest): Promise<PaymentResponse> {
    this.logger.info(
      {
        phoneNumber: this.maskPhoneNumber(request.phoneNumber),
        amount: request.amount,
        merchantReference: request.merchantReference,
      },
      'Initiating B2C payment',
    );

    const sasaPayRequest = this.requestMapper.mapB2CRequest(request);

    try {
      const response = await this.httpService.post<SasaPayB2CResponseDto>(
        ENDPOINTS.B2C_SEND_MONEY,
        sasaPayRequest,
      );

      const mappedResponse = this.responseMapper.mapB2CResponse(response);

      this.logger.info(
        {
          success: mappedResponse.success,
          merchantRequestId: mappedResponse.merchantRequestId,
        },
        'B2C payment completed',
      );

      return mappedResponse;
    } catch (error) {
      this.handleProviderError(error, 'B2C payment');
    }
  }

  async transferB2B(request: B2BPaymentRequest): Promise<PaymentResponse> {
    this.logger.info(
      {
        receiverMerchantCode: request.receiverMerchantCode,
        amount: request.amount,
        merchantReference: request.merchantReference,
      },
      'Initiating B2B transfer',
    );

    const sasaPayRequest = this.requestMapper.mapB2BRequest(request);

    try {
      const response = await this.httpService.post<SasaPayB2BResponseDto>(
        ENDPOINTS.B2B_TRANSFER,
        sasaPayRequest,
      );

      const mappedResponse = this.responseMapper.mapB2BResponse(response);

      this.logger.info(
        {
          success: mappedResponse.success,
          merchantRequestId: mappedResponse.merchantRequestId,
        },
        'B2B transfer completed',
      );

      return mappedResponse;
    } catch (error) {
      this.handleProviderError(error, 'B2B transfer');
    }
  }

  async getBalance(merchantCode: string): Promise<BalanceResponse> {
    this.logger.debug({ merchantCode }, 'Checking account balance');

    const sasaPayRequest = this.requestMapper.mapBalanceRequest(merchantCode);

    try {
      const response = await this.httpService.post<SasaPayBalanceResponseDto>(
        ENDPOINTS.BALANCE,
        sasaPayRequest,
      );

      const mappedResponse = this.responseMapper.mapBalanceResponse(response);

      this.logger.info(
        { success: mappedResponse.success, currency: mappedResponse.currency },
        'Balance check completed',
      );

      return mappedResponse;
    } catch (error) {
      this.handleProviderError(error, 'Balance check');
    }
  }

  async getTransactionStatus(
    request: TransactionStatusRequest,
  ): Promise<TransactionStatusResponse> {
    this.logger.debug(
      {
        checkoutRequestId: request.checkoutRequestId,
        merchantRequestId: request.merchantRequestId,
      },
      'Checking transaction status',
    );

    const sasaPayRequest = this.requestMapper.mapTransactionStatusRequest(request);

    try {
      const response = await this.httpService.post<SasaPayTransactionStatusResponseDto>(
        ENDPOINTS.TRANSACTION_STATUS,
        sasaPayRequest,
      );

      const mappedResponse = this.responseMapper.mapTransactionStatusResponse(response);

      this.logger.info(
        {
          success: mappedResponse.success,
          status: mappedResponse.status,
          resultCode: mappedResponse.resultCode,
        },
        'Transaction status check completed',
      );

      return mappedResponse;
    } catch (error) {
      this.handleProviderError(error, 'Transaction status check');
    }
  }

  private maskPhoneNumber(phoneNumber: string): string {
    if (!phoneNumber || phoneNumber.length < 4) {
      return '****';
    }
    return `****${phoneNumber.slice(-4)}`;
  }

  private handleProviderError(error: unknown, operation: string): never {
    if (error instanceof BasePaymentException) {
      throw error;
    }

    // Extract details from HttpException
    if (error instanceof HttpException) {
      const response = error.getResponse() as Record<string, unknown>;
      const statusCode = error.getStatus();

      this.logger.error(
        {
          operation,
          statusCode,
          message: response?.message,
          error: response?.error,
          details: response?.details,
        },
        `${operation} failed with HTTP ${statusCode}`,
      );

      const errorMessage = (response?.message as string) || error.message;
      throw new BasePaymentException(
        `${operation} failed: ${errorMessage}`,
        statusCode,
        undefined,
        response?.details as Record<string, unknown>,
      );
    }

    const err = error as Error;
    this.logger.error({ error: err.message, operation }, `${operation} failed`);

    throw new BasePaymentException(`${operation} failed: ${err.message}`);
  }
}

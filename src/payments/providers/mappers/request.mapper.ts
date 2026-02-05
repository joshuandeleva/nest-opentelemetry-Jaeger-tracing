import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import {
  SasaPayC2BRequestDto,
  SasaPayB2CRequestDto,
  SasaPayB2BRequestDto,
  SasaPayBalanceRequestDto,
  SasaPayTransactionStatusRequestDto,
  SasaPayNetworkCode,
  SasaPayChannel,
} from '../dto/sasapay.dto';

export interface C2BPaymentRequest {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  description?: string;
  currency?: string;
  networkCode?: string;
  callbackUrl?: string;
}

export interface B2CPaymentRequest {
  phoneNumber: string;
  amount: number;
  merchantReference: string;
  reason?: string;
  currency?: string;
  channel?: string;
  callbackUrl?: string;
}

export interface B2BPaymentRequest {
  receiverMerchantCode: string;
  amount: number;
  merchantReference: string;
  reason?: string;
  currency?: string;
  callbackUrl?: string;
  accountReference?: string;
  receiverAccountType: string;
  networkCode: string;
}

export interface TransactionStatusRequest {
  merchantCode: string;
  checkoutRequestId?: string;
  merchantRequestId?: string;
}

@Injectable()
export class RequestMapper implements OnModuleInit {
  private readonly merchantCode: string;
  private readonly defaultCallbackUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(RequestMapper.name);
    this.merchantCode = this.configService.get<string>('sasapay.merchantCode') || '';
    this.defaultCallbackUrl = this.configService.get<string>('sasapay.callbackUrl') || '';
  }

  onModuleInit() {
    this.logger.info(
      {
        merchantCode: this.merchantCode,
        defaultCallbackUrl: this.defaultCallbackUrl,
      },
      'RequestMapper initialized with config',
    );

    if (!this.defaultCallbackUrl) {
      this.logger.warn('No default callback URL configured (SASAPAY_CALLBACK_URL)');
    }
  }

  mapC2BRequest(request: C2BPaymentRequest): SasaPayC2BRequestDto {
    const callbackUrl = request.callbackUrl || this.defaultCallbackUrl;

    this.logger.info(
      {
        providedCallbackUrl: request.callbackUrl || 'none',
        usingCallbackUrl: callbackUrl,
        isDefault: !request.callbackUrl,
      },
      'Mapping C2B request callback URL',
    );

    return {
      MerchantCode: this.merchantCode,
      NetworkCode: request.networkCode || SasaPayNetworkCode.MPESA,
      PhoneNumber: this.normalizePhoneNumber(request.phoneNumber),
      TransactionDesc: request.description || 'Payment',
      AccountReference: request.accountReference,
      Currency: request.currency || 'KES',
      Amount: this.formatAmount(request.amount),
      CallBackURL: callbackUrl,
    };
  }

  mapB2CRequest(request: B2CPaymentRequest): SasaPayB2CRequestDto {
    return {
      MerchantCode: this.merchantCode,
      MerchantTransactionReference: request.merchantReference,
      Currency: request.currency || 'KES',
      Amount: this.formatAmount(request.amount),
      ReceiverNumber: this.normalizePhoneNumber(request.phoneNumber),
      Channel: request.channel || SasaPayChannel.MPESA,
      CallBackURL: request.callbackUrl || this.defaultCallbackUrl,
      Reason: request.reason || 'Disbursement',
    };
  }

  mapB2BRequest(request: B2BPaymentRequest): SasaPayB2BRequestDto {
    return {
      MerchantCode: this.merchantCode,
      MerchantTransactionReference: request.merchantReference,
      Currency: request.currency || 'KES',
      Amount: this.formatAmount(request.amount),
      ReceiverMerchantCode: request.receiverMerchantCode,
      AccountReference: request.accountReference,
      ReceiverAccountType: request.receiverAccountType,
      NetworkCode: request.networkCode,
      CallBackURL: request.callbackUrl || this.defaultCallbackUrl,
      Reason: request.reason || 'B2B Transfer',
    };
  }

  mapBalanceRequest(merchantCode: string): SasaPayBalanceRequestDto {
    return {
      MerchantCode: merchantCode,
    };
  }

  mapTransactionStatusRequest(
    request: TransactionStatusRequest,
  ): SasaPayTransactionStatusRequestDto {
    return {
      MerchantCode: request.merchantCode,
      CheckoutRequestID: request.checkoutRequestId,
      MerchantTransactionReference: request.merchantRequestId,
      CallbackUrl: this.defaultCallbackUrl,
    };
  }

  private normalizePhoneNumber(phoneNumber: string): string {
    let normalized = phoneNumber.replace(/[\s\-()]/g, '');

    if (normalized.startsWith('+')) {
      normalized = normalized.substring(1);
    }

    if (normalized.startsWith('0')) {
      normalized = '254' + normalized.substring(1);
    }

    if (!normalized.startsWith('254')) {
      normalized = '254' + normalized;
    }

    return normalized;
  }

  private formatAmount(amount: number): string {
    return amount.toFixed(2);
  }
}

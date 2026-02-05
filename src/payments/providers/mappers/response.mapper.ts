import { Injectable } from '@nestjs/common';
import {
  SasaPayC2BResponseDto,
  SasaPayB2CResponseDto,
  SasaPayB2BResponseDto,
  SasaPayBalanceResponseDto,
  SasaPayTransactionStatusResponseDto,
  SasaPayWebhookPayloadDto,
} from '../dto/sasapay.dto';
import { TransactionStatus } from '../../database/schemas/transaction.schema';

// SasaPay transaction result codes with descriptions
export const SASAPAY_RESULT_CODES: Record<string, string> = {
  '0': 'Success',
  SP00000: 'Success',
  '1032': 'Request cancelled by user',
  SP01001: 'Request cancelled by user',
  '1037': 'STK timeout',
  SP01002: 'No callback from MNO - STK or network issue',
  '2001': 'Wrong PIN',
  SP01003: 'Wrong PIN',
  '1': 'Insufficient balance',
  SP01004: 'Insufficient balance',
  SP01005: 'Transaction already processed',
  AC01: 'Bank account not found',
};

export interface PaymentResponse {
  success: boolean;
  merchantRequestId?: string;
  checkoutRequestId?: string;
  message: string;
  customerMessage?: string;
}

export interface BalanceResponse {
  success: boolean;
  balance?: number;
  currency?: string;
  message: string;
}

export interface TransactionStatusResponse {
  success: boolean;
  status: TransactionStatus;
  resultCode: string;
  resultDescription: string;
  transactionType: string;
  transactionDate: string;
  checkoutId: string;
  checkoutRequestId: string;
  merchantReference: string;
  requestedAmount: string;
  paid: boolean;
  isReversed: boolean;
  paidAmount: string;
  paidDate: string;
  sourceChannel: string;
  destinationChannel: string;
  transId: string;
  transactionCode: string;
  thirdPartyTransactionCode: string;
  reversalTransactionCode: string;
}

export interface WebhookData {
  merchantCode?: string;
  merchantRequestId: string;
  checkoutRequestId?: string;
  resultCode: string;
  resultDescription: string;
  amount?: number;
  transactionDate?: string;
  phoneNumber?: string;
  receiptNumber?: string;
  status: TransactionStatus;
}

@Injectable()
export class ResponseMapper {
  mapC2BResponse(response: SasaPayC2BResponseDto): PaymentResponse {
    return {
      success: response.status === true,
      merchantRequestId: response.MerchantRequestID,
      checkoutRequestId: response.CheckoutRequestID,
      message: response.ResponseDescription || response.detail || 'Unknown',
      customerMessage: response.CustomerMessage,
    };
  }

  mapB2CResponse(response: SasaPayB2CResponseDto): PaymentResponse {
    return {
      success: response.status === true,
      merchantRequestId: response.MerchantRequestID,
      message: response.ResponseDescription || response.detail || 'Unknown',
    };
  }

  mapB2BResponse(response: SasaPayB2BResponseDto): PaymentResponse {
    return {
      success: response.status === true,
      merchantRequestId: response.MerchantRequestID,
      message: response.ResponseDescription || response.detail || 'Unknown',
    };
  }

  mapBalanceResponse(response: SasaPayBalanceResponseDto): BalanceResponse {
    return {
      success: response.status === true,
      balance: response.Balance,
      currency: response.Currency || 'KES',
      message: response.detail || 'Success',
    };
  }

  mapTransactionStatusResponse(
    response: SasaPayTransactionStatusResponseDto,
  ): TransactionStatusResponse {
    return {
      success: response.Paid === true,
      status: this.mapResultCodeToStatus(response.ResultCode),
      resultCode: response.ResultCode,
      resultDescription: response.ResultDescription,
      transactionType: response.TransactionType,
      transactionDate: response.TransactionDate,
      checkoutId: response.CheckoutId,
      checkoutRequestId: response.CheckoutRequestID,
      merchantReference: response.MerchantReference,
      requestedAmount: response.RequestedAmount,
      paid: response.Paid,
      isReversed: response.IsReversed,
      paidAmount: response.PaidAmount,
      paidDate: response.PaidDate,
      sourceChannel: response.SourceChannel,
      destinationChannel: response.DestinationChannel,
      transId: response.TransID,
      transactionCode: response.TransactionCode,
      thirdPartyTransactionCode: response.ThirdPartyTransactionCode,
      reversalTransactionCode: response.ReversalTransactionCode,
    };
  }

  mapWebhookPayload(payload: SasaPayWebhookPayloadDto): WebhookData {
    // Handle both field name variants
    const merchantRequestId = payload.MerchantRequestID ?? payload.MerchantReference ?? '';
    const checkoutRequestId = payload.CheckoutRequestID ?? payload.CheckoutId;
    const resultCode = payload.ResultCode ?? '';
    const resultDescription = payload.ResultDesc ?? payload.ResultDescription ?? '';

    // Parse amount from various fields
    const amount = payload.Amount
      ? parseFloat(payload.Amount)
      : payload.TransAmount
        ? parseFloat(payload.TransAmount)
        : payload.PaidAmount
          ? parseFloat(payload.PaidAmount)
          : undefined;

    const phoneNumber = payload.PhoneNumber ?? payload.CustomerMobile;
    const receiptNumber = payload.ReceiptNumber ?? payload.TransactionCode ?? payload.TransID;

    return {
      merchantCode: payload.MerchantCode,
      merchantRequestId,
      checkoutRequestId,
      resultCode,
      resultDescription,
      amount,
      transactionDate: payload.TransactionDate,
      phoneNumber,
      receiptNumber,
      status: this.mapWebhookStatusToTransactionStatus(
        payload.TransactionStatus,
        resultCode,
        payload.Paid,
      ),
    };
  }

  private mapResultCodeToStatus(resultCode?: string): TransactionStatus {
    if (!resultCode) {
      return TransactionStatus.PENDING;
    }

    switch (resultCode) {
      case '0':
      case 'SP00000':
        return TransactionStatus.SUCCESS;

      case '1032':
      case 'SP01001':
        return TransactionStatus.CANCELLED;

      case '1037':
      case 'SP01002':
        return TransactionStatus.FAILED;

      case '2001':
      case 'SP01003':
        return TransactionStatus.FAILED;

      case '1':
      case 'SP01004':
        return TransactionStatus.FAILED;

      case 'SP01005':
        return TransactionStatus.FAILED;

      case 'AC01':
        return TransactionStatus.FAILED;

      default:
        if (resultCode.startsWith('0') || resultCode === 'SP00000') {
          return TransactionStatus.SUCCESS;
        }
        return TransactionStatus.FAILED;
    }
  }

  getResultDescription(resultCode: string): string {
    return SASAPAY_RESULT_CODES[resultCode] || 'Unknown error';
  }

  private mapWebhookStatusToTransactionStatus(
    status?: string,
    resultCode?: string,
    paid?: boolean,
  ): TransactionStatus {
    if (paid === true) {
      return TransactionStatus.SUCCESS;
    }
    if (paid === false) {
      return TransactionStatus.FAILED;
    }

    const normalizedStatus = status?.toUpperCase();

    switch (normalizedStatus) {
      case 'SUCCESS':
      case 'COMPLETED':
        return TransactionStatus.SUCCESS;
      case 'FAILED':
      case 'FAILURE':
        return TransactionStatus.FAILED;
      case 'CANCELLED':
      case 'CANCELED':
        return TransactionStatus.CANCELLED;
      case 'PENDING':
      case 'PROCESSING':
        return TransactionStatus.PROCESSING;
      default:
        return this.mapResultCodeToStatus(resultCode);
    }
  }
}

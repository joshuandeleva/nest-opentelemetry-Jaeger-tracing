import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { TransactionRepository } from '../database/repositories/transaction.repository';
import { TransactionStatus } from '../database/schemas/transaction.schema';
import { ResponseMapper } from '../providers/mappers/response.mapper';
import { SasaPayWebhookPayloadDto } from '../providers/dto/sasapay.dto';
import { WebhookPayloadDto, WebhookResponseDto } from './dto/webhook.dto';

@Injectable()
export class WebhooksService {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly responseMapper: ResponseMapper,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(WebhooksService.name);
  }

  async processCallback(payload: WebhookPayloadDto): Promise<WebhookResponseDto> {
    const merchantRef = payload.MerchantRequestID ?? payload.MerchantReference;
    const resultDesc = payload.ResultDesc ?? payload.ResultDescription;

    this.logger.info(
      {
        merchantReference: merchantRef,
        checkoutRequestId: payload.CheckoutRequestID ?? payload.CheckoutId ?? undefined,
        paymentRequestId: payload.PaymentRequestID ?? undefined,
        resultCode: payload.ResultCode,
        resultDesc,
        transactionStatus: payload.TransactionStatus,
        paid: payload.Paid,
      },
      'Processing webhook callback',
    );

    try {
      const webhookData = this.responseMapper.mapWebhookPayload(
        payload as SasaPayWebhookPayloadDto,
      );

      if (!merchantRef) {
        this.logger.warn('No merchant reference in webhook payload');
        return {
          success: true,
          message: 'Webhook received but no merchant reference provided',
        };
      }

      const transaction = await this.transactionRepository.findByMerchantRef(merchantRef);

      if (!transaction) {
        this.logger.warn(
          {
            merchantReference: merchantRef,
            checkoutRequestId: payload.CheckoutRequestID ?? payload.CheckoutId ?? undefined,
            paymentRequestId: payload.PaymentRequestID ?? undefined,
          },
          'Transaction not found for webhook callback',
        );

        return {
          success: true,
          message: 'Webhook received but transaction not found',
        };
      }

      await this.transactionRepository.updateByTransactionId(transaction.transactionId, {
        status: webhookData.status,
        webhookData: payload as unknown as Record<string, unknown>,
        completedAt:
          webhookData.status === TransactionStatus.SUCCESS ||
          webhookData.status === TransactionStatus.FAILED
            ? new Date()
            : undefined,
        errorMessage:
          webhookData.status === TransactionStatus.FAILED
            ? webhookData.resultDescription
            : undefined,
      });

      this.logger.info(
        {
          transactionId: transaction.transactionId,
          merchantReference: transaction.merchantReference,
          newStatus: webhookData.status,
          receiptNumber: webhookData.receiptNumber,
        },
        'Transaction updated from webhook',
      );

      return {
        success: true,
        message: 'Webhook processed successfully',
      };
    } catch (error) {
      this.logger.error(
        {
          error: (error as Error).message,
          merchantReference: merchantRef,
        },
        'Failed to process webhook callback',
      );
      return {
        success: true,
        message: 'Webhook received with processing error',
      };
    }
  }
}

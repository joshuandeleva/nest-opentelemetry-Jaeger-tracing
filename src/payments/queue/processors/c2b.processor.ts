import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job, UnrecoverableError } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';
import { SpanStatusCode } from '@opentelemetry/api';
import { SasaPayProvider } from '../../providers/sasapay.provider';
import { TransactionRepository } from '../../database/repositories/transaction.repository';
import { TransactionStatus } from '../../database/schemas/transaction.schema';
import { C2BJobData } from '../dto/payment-job.dto';
import { QUEUE_NAMES } from '../queue.constants';
import { BasePaymentException } from '../../exceptions/payment.exception';
import { createJobSpan, runWithSpanAsync } from '../../../common/tracing/bullmq-propagation';

@Processor(QUEUE_NAMES.C2B)
export class C2BProcessor extends WorkerHost {
  constructor(
    private readonly sasaPayProvider: SasaPayProvider,
    private readonly transactionRepository: TransactionRepository,
    private readonly logger: PinoLogger,
  ) {
    super();
    this.logger.setContext(C2BProcessor.name);
  }

  async process(job: Job<C2BJobData>): Promise<void> {
    const { transactionId, phoneNumber, amount, accountReference, description, traceContext } =
      job.data;

    const span = createJobSpan('bullmq.c2b.process', traceContext || {}, {
      'job.id': job.id || '',
      'job.attempt': job.attemptsMade + 1,
      'transaction.id': transactionId,
      'payment.amount': amount,
      'payment.type': 'C2B',
    });

    return runWithSpanAsync(span, async () => {
      this.logger.info(
        {
          jobId: job.id,
          transactionId,
          amount,
          attempt: job.attemptsMade + 1,
        },
        'Processing C2B payment job',
      );

      try {
        await this.transactionRepository.updateStatus(transactionId, TransactionStatus.PROCESSING);
        const response = await this.sasaPayProvider.requestC2BPayment({
          phoneNumber,
          amount,
          accountReference,
          description,
          callbackUrl: job.data.callbackUrl,
          networkCode: job.data.networkCode,
          currency: job.data.currency,
        });

        await this.transactionRepository.updateByTransactionId(transactionId, {
          response: {
            merchantRequestId: response.merchantRequestId,
            checkoutRequestId: response.checkoutRequestId,
            message: response.message,
            customerMessage: response.customerMessage,
          },
          status: response.success ? TransactionStatus.PROCESSING : TransactionStatus.FAILED,
          errorMessage: response.success ? undefined : response.message,
        });

        if (!response.success) {
          throw new Error(`C2B payment failed: ${response.message}`);
        }

        span.setStatus({ code: SpanStatusCode.OK });
        this.logger.info(
          {
            jobId: job.id,
            transactionId,
            merchantRequestId: response.merchantRequestId,
            checkoutRequestId: response.checkoutRequestId,
          },
          'C2B payment job completed successfully',
        );
      } catch (error) {
        const errorMessage = (error as Error).message;
        const statusCode = error instanceof BasePaymentException ? error.getStatus() : 500;

        span.setStatus({ code: SpanStatusCode.ERROR, message: errorMessage });
        span.recordException(error as Error);

        this.logger.error(
          {
            jobId: job.id,
            transactionId,
            error: errorMessage,
            statusCode,
            attempt: job.attemptsMade + 1,
          },
          'C2B payment job failed',
        );

        await this.transactionRepository.updateStatus(
          transactionId,
          TransactionStatus.FAILED,
          errorMessage,
        );

        if (statusCode >= 400 && statusCode < 500) {
          throw new UnrecoverableError(errorMessage);
        }

        throw error;
      } finally {
        span.end();
      }
    });
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<C2BJobData>) {
    this.logger.debug(
      { jobId: job.id, transactionId: job.data.transactionId },
      'C2B payment job completed event',
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<C2BJobData>, error: Error) {
    this.logger.error(
      {
        jobId: job.id,
        transactionId: job.data.transactionId,
        error: error.message,
        attemptsMade: job.attemptsMade,
      },
      'C2B payment job failed event',
    );
  }
}

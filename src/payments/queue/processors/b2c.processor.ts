import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job, UnrecoverableError } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';
import { SpanStatusCode } from '@opentelemetry/api';
import { SasaPayProvider } from '../../providers/sasapay.provider';
import { TransactionRepository } from '../../database/repositories/transaction.repository';
import { TransactionStatus } from '../../database/schemas/transaction.schema';
import { B2CJobData } from '../dto/payment-job.dto';
import { QUEUE_NAMES } from '../queue.constants';
import { BasePaymentException } from '../../exceptions/payment.exception';
import { createJobSpan, runWithSpanAsync } from '../../../common/tracing/bullmq-propagation';

@Processor(QUEUE_NAMES.B2C)
export class B2CProcessor extends WorkerHost {
  constructor(
    private readonly sasaPayProvider: SasaPayProvider,
    private readonly transactionRepository: TransactionRepository,
    private readonly logger: PinoLogger,
  ) {
    super();
    this.logger.setContext(B2CProcessor.name);
  }

  async process(job: Job<B2CJobData>): Promise<void> {
    const { transactionId, phoneNumber, amount, merchantReference, reason, traceContext } =
      job.data;

    const span = createJobSpan('bullmq.b2c.process', traceContext || {}, {
      'job.id': job.id || '',
      'job.attempt': job.attemptsMade + 1,
      'transaction.id': transactionId,
      'payment.amount': amount,
      'payment.type': 'B2C',
    });

    return runWithSpanAsync(span, async () => {
      this.logger.info(
        {
          jobId: job.id,
          transactionId,
          amount,
          attempt: job.attemptsMade + 1,
        },
        'Processing B2C payment job',
      );

      try {
        await this.transactionRepository.updateStatus(transactionId, TransactionStatus.PROCESSING);

        const response = await this.sasaPayProvider.sendB2CPayment({
          phoneNumber,
          amount,
          merchantReference,
          reason,
          callbackUrl: job.data.callbackUrl,
          channel: job.data.channel,
          currency: job.data.currency,
        });

        await this.transactionRepository.updateByTransactionId(transactionId, {
          response: {
            merchantRequestId: response.merchantRequestId,
            message: response.message,
          },
          status: response.success ? TransactionStatus.PROCESSING : TransactionStatus.FAILED,
          errorMessage: response.success ? undefined : response.message,
        });

        if (!response.success) {
          throw new Error(`B2C payment failed: ${response.message}`);
        }

        span.setStatus({ code: SpanStatusCode.OK });
        this.logger.info(
          {
            jobId: job.id,
            transactionId,
            merchantRequestId: response.merchantRequestId,
          },
          'B2C payment job completed successfully',
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
          'B2C payment job failed',
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
  onCompleted(job: Job<B2CJobData>) {
    this.logger.debug(
      { jobId: job.id, transactionId: job.data.transactionId },
      'B2C payment job completed event',
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<B2CJobData>, error: Error) {
    this.logger.error(
      {
        jobId: job.id,
        transactionId: job.data.transactionId,
        error: error.message,
        attemptsMade: job.attemptsMade,
      },
      'B2C payment job failed event',
    );
  }
}

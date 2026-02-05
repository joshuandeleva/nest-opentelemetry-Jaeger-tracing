import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';
import { v4 as uuidv4 } from 'uuid';
import { TransactionRepository } from '../database/repositories/transaction.repository';
import { TransactionType, TransactionStatus } from '../database/schemas/transaction.schema';
import {
  C2BPaymentDto,
  B2CPaymentDto,
  B2BPaymentDto,
  PaymentResponseDto,
  BalanceResponseDto,
  TokenResponseDto,
} from './dto/payment.dto';
import { AuthService } from '../providers/auth/auth.service';
import { C2BJobData, B2CJobData, B2BJobData } from '../queue/dto/payment-job.dto';
import { QUEUE_NAMES, JOB_NAMES } from '../queue/queue.constants';
import { SasaPayProvider } from '../providers/sasapay.provider';
import { TransactionStatusResponse } from '../providers/mappers/response.mapper';
import { DuplicateTransactionException } from '../exceptions/payment.exception';
import { injectTraceContext } from '../../common/tracing/bullmq-propagation';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectQueue(QUEUE_NAMES.C2B) private readonly c2bQueue: Queue<C2BJobData>,
    @InjectQueue(QUEUE_NAMES.B2C) private readonly b2cQueue: Queue<B2CJobData>,
    @InjectQueue(QUEUE_NAMES.B2B) private readonly b2bQueue: Queue<B2BJobData>,
    private readonly transactionRepository: TransactionRepository,
    private readonly sasaPayProvider: SasaPayProvider,
    private readonly authService: AuthService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(PaymentsService.name);
  }

  async initiateC2BPayment(dto: C2BPaymentDto): Promise<PaymentResponseDto> {
    this.logger.info(
      {
        merchantReference: dto.merchantReference,
        amount: dto.amount,
      },
      'Initiating C2B payment',
    );

    if (await this.transactionRepository.exists(dto.merchantReference)) {
      throw new DuplicateTransactionException(
        `Transaction with reference ${dto.merchantReference} already exists`,
      );
    }

    const transactionId = uuidv4();

    await this.transactionRepository.create({
      transactionId,
      merchantReference: dto.merchantReference,
      type: TransactionType.C2B,
      amount: dto.amount,
      currency: dto.currency || 'KES',
      phoneNumber: dto.phoneNumber,
      description: dto.description,
      request: dto,
    });

    const jobData: C2BJobData = {
      type: TransactionType.C2B,
      transactionId,
      merchantReference: dto.merchantReference,
      phoneNumber: dto.phoneNumber,
      amount: dto.amount,
      currency: dto.currency || 'KES',
      accountReference: dto.merchantReference,
      description: dto.description,
      networkCode: dto.networkCode,
      callbackUrl: dto.callbackUrl,
      traceContext: injectTraceContext(),
    };

    await this.c2bQueue.add(JOB_NAMES.C2B_PAYMENT, jobData, {
      jobId: transactionId,
    });

    this.logger.info(
      { transactionId, merchantReference: dto.merchantReference },
      'C2B payment queued successfully',
    );

    return {
      transactionId,
      merchantReference: dto.merchantReference,
      status: TransactionStatus.PENDING,
      message: 'Payment request queued for processing',
    };
  }

  async initiateB2CPayment(dto: B2CPaymentDto): Promise<PaymentResponseDto> {
    this.logger.info(
      {
        merchantReference: dto.merchantReference,
        amount: dto.amount,
      },
      'Initiating B2C payment',
    );

    if (await this.transactionRepository.exists(dto.merchantReference)) {
      throw new DuplicateTransactionException(
        `Transaction with reference ${dto.merchantReference} already exists`,
      );
    }

    const transactionId = uuidv4();

    await this.transactionRepository.create({
      transactionId,
      merchantReference: dto.merchantReference,
      type: TransactionType.B2C,
      amount: dto.amount,
      currency: dto.currency || 'KES',
      phoneNumber: dto.phoneNumber,
      description: dto.reason,
      request: dto,
    });

    const jobData: B2CJobData = {
      type: TransactionType.B2C,
      transactionId,
      merchantReference: dto.merchantReference,
      phoneNumber: dto.phoneNumber,
      amount: dto.amount,
      currency: dto.currency || 'KES',
      reason: dto.reason,
      channel: dto.channel,
      callbackUrl: dto.callbackUrl,
      traceContext: injectTraceContext(),
    };

    await this.b2cQueue.add(JOB_NAMES.B2C_PAYMENT, jobData, {
      jobId: transactionId,
    });

    this.logger.info(
      { transactionId, merchantReference: dto.merchantReference },
      'B2C payment queued successfully',
    );

    return {
      transactionId,
      merchantReference: dto.merchantReference,
      status: TransactionStatus.PENDING,
      message: 'Payment request queued for processing',
    };
  }

  async initiateB2BTransfer(dto: B2BPaymentDto): Promise<PaymentResponseDto> {
    this.logger.info(
      {
        merchantReference: dto.merchantReference,
        receiverMerchantCode: dto.receiverMerchantCode,
        amount: dto.amount,
      },
      'Initiating B2B transfer',
    );

    if (await this.transactionRepository.exists(dto.merchantReference)) {
      throw new DuplicateTransactionException(
        `Transaction with reference ${dto.merchantReference} already exists`,
      );
    }

    const transactionId = uuidv4();

    await this.transactionRepository.create({
      transactionId,
      merchantReference: dto.merchantReference,
      type: TransactionType.B2B,
      amount: dto.amount,
      currency: dto.currency || 'KES',
      accountNumber: dto.receiverMerchantCode,
      description: dto.reason,
      request: dto,
    });

    const jobData: B2BJobData = {
      type: TransactionType.B2B,
      transactionId,
      merchantReference: dto.merchantReference,
      receiverMerchantCode: dto.receiverMerchantCode,
      amount: dto.amount,
      currency: dto.currency || 'KES',
      reason: dto.reason,
      callbackUrl: dto.callbackUrl,
      receiverAccountType: dto.receiverAccountType,
      networkCode: dto.networkCode,
      traceContext: injectTraceContext(),
      ...(dto.accountReference && { accountReference: dto.accountReference }),
    };

    await this.b2bQueue.add(JOB_NAMES.B2B_TRANSFER, jobData, {
      jobId: transactionId,
    });

    this.logger.info(
      { transactionId, merchantReference: dto.merchantReference },
      'B2B transfer queued successfully',
    );

    return {
      transactionId,
      merchantReference: dto.merchantReference,
      status: TransactionStatus.PENDING,
      message: 'Transfer request queued for processing',
    };
  }

  async getTransactionStatus(
    merchantCode: string,
    checkoutRequestId?: string,
    merchantReference?: string,
  ): Promise<TransactionStatusResponse> {
    this.logger.debug(
      { merchantCode, checkoutRequestId, merchantReference },
      'Getting transaction status from SasaPay',
    );

    return this.sasaPayProvider.getTransactionStatus({
      merchantCode,
      checkoutRequestId,
      merchantRequestId: merchantReference,
    });
  }

  async getBalance(merchantCode: string): Promise<BalanceResponseDto> {
    this.logger.debug({ merchantCode }, 'Getting account balance');

    const response = await this.sasaPayProvider.getBalance(merchantCode);

    return {
      success: response.success,
      balance: response.balance,
      currency: response.currency || 'KES',
      message: response.message,
    };
  }

  async generateToken(): Promise<TokenResponseDto> {
    this.logger.debug('Generating access token');

    const tokenInfo = await this.authService.generateToken();

    return {
      accessToken: tokenInfo.accessToken,
      tokenType: tokenInfo.tokenType,
      expiresIn: tokenInfo.expiresIn,
      generatedAt: tokenInfo.generatedAt,
    };
  }
}

import { TraceCarrier } from '../../../common/tracing/bullmq-propagation';
import { TransactionType } from '../../database/schemas/transaction.schema';

export interface BasePaymentJobData {
  transactionId: string;
  merchantReference: string;
  amount: number;
  currency: string;
  callbackUrl?: string;
  traceContext?: TraceCarrier;
}

export interface C2BJobData extends BasePaymentJobData {
  type: TransactionType.C2B;
  phoneNumber: string;
  accountReference: string;
  description?: string;
  networkCode?: string;
}

export interface B2CJobData extends BasePaymentJobData {
  type: TransactionType.B2C;
  phoneNumber: string;
  reason?: string;
  channel?: string;
}

export interface B2BJobData extends BasePaymentJobData {
  type: TransactionType.B2B;
  receiverMerchantCode: string;
  reason?: string;
  accountReference?: string;
  receiverAccountType: string;
  networkCode: string;
}

export type PaymentJobData = C2BJobData | B2CJobData | B2BJobData;

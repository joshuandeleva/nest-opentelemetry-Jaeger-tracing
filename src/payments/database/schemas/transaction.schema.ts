import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum TransactionType {
  C2B = 'C2B',
  B2C = 'B2C',
  B2B = 'B2B',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

@Schema({ timestamps: true, collection: 'transactions' })
export class Transaction extends Document {
  @Prop({ required: true, unique: true, index: true })
  transactionId: string;

  @Prop({ required: true, unique: true, index: true })
  merchantReference: string;

  @Prop({
    required: true,
    enum: TransactionType,
    index: true,
  })
  type: TransactionType;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, default: 'KES' })
  currency: string;

  @Prop()
  phoneNumber?: string;

  @Prop()
  accountNumber?: string;

  @Prop()
  accountName?: string;

  @Prop()
  description?: string;

  @Prop({
    required: true,
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
    index: true,
  })
  status: TransactionStatus;

  @Prop({ type: Object })
  request: Record<string, any>;

  @Prop({ type: Object })
  response: Record<string, any>;

  @Prop({ type: Object })
  webhookData: Record<string, any>;

  @Prop()
  errorMessage?: string;

  @Prop()
  completedAt?: Date;

  @Prop({ type: Object })
  metadata: Record<string, any>;

  @Prop({ default: Date.now, index: true })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

// Compound indexes (simple indexes are already defined in @Prop decorators)
TransactionSchema.index({ status: 1, createdAt: -1 });
TransactionSchema.index({ phoneNumber: 1, createdAt: -1 });
TransactionSchema.index({ type: 1, status: 1 });

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'idempotency_keys' })
export class IdempotencyKey extends Document {
  @Prop({ required: true, unique: true, index: true })
  key: string;

  @Prop({ required: true })
  endpoint: string;

  @Prop({ type: Object, required: true })
  request: Record<string, any>;

  @Prop({ type: Object, required: true })
  response: Record<string, any>;

  @Prop({ required: true })
  statusCode: number;

  @Prop({ required: true, index: true })
  transactionId: string;

  @Prop({ default: Date.now, index: true })
  createdAt: Date;

  @Prop({ type: Date, required: true })
  expiresAt: Date;
}

export const IdempotencyKeySchema = SchemaFactory.createForClass(IdempotencyKey);

IdempotencyKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

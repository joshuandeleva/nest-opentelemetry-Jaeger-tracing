import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IdempotencyKey } from '../schemas/idempotency.schema';

export interface CreateIdempotencyKeyDto {
  key: string;
  endpoint: string;
  request: Record<string, any>;
  response: Record<string, any>;
  statusCode: number;
  transactionId: string;
  ttl: number;
}

@Injectable()
export class IdempotencyRepository {
  constructor(
    @InjectModel(IdempotencyKey.name)
    private readonly idempotencyModel: Model<IdempotencyKey>,
  ) {}

  async create(dto: CreateIdempotencyKeyDto): Promise<IdempotencyKey> {
    const expiresAt = new Date(Date.now() + dto.ttl * 1000);

    const idempotencyKey = new this.idempotencyModel({
      key: dto.key,
      endpoint: dto.endpoint,
      request: dto.request,
      response: dto.response,
      statusCode: dto.statusCode,
      transactionId: dto.transactionId,
      createdAt: new Date(),
      expiresAt,
    });

    return idempotencyKey.save();
  }

  async findByKey(key: string): Promise<IdempotencyKey | null> {
    return this.idempotencyModel.findOne({ key }).exec();
  }

  async exists(key: string): Promise<boolean> {
    const count = await this.idempotencyModel.countDocuments({ key }).exec();
    return count > 0;
  }

  async deleteExpired(): Promise<number> {
    const result = await this.idempotencyModel
      .deleteMany({ expiresAt: { $lte: new Date() } })
      .exec();
    return result.deletedCount || 0;
  }

  async deleteByKey(key: string): Promise<boolean> {
    const result = await this.idempotencyModel.deleteOne({ key }).exec();
    return (result.deletedCount || 0) > 0;
  }
}

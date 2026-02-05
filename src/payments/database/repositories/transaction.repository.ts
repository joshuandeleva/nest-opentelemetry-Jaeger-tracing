import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction, TransactionStatus, TransactionType } from '../schemas/transaction.schema';
import { TransactionNotFoundException } from '../../exceptions/payment.exception';

export interface CreateTransactionDto {
  transactionId: string;
  merchantReference: string;
  type: TransactionType;
  amount: number;
  currency?: string;
  phoneNumber?: string;
  accountNumber?: string;
  accountName?: string;
  description?: string;
  request?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface UpdateTransactionDto {
  status?: TransactionStatus;
  response?: Record<string, any>;
  webhookData?: Record<string, any>;
  errorMessage?: string;
  completedAt?: Date;
  updatedAt?: Date;
}

@Injectable()
export class TransactionRepository {
  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction>,
  ) {}

  async create(dto: CreateTransactionDto): Promise<Transaction> {
    const transaction = new this.transactionModel({
      ...dto,
      status: TransactionStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return transaction.save();
  }

  async findById(id: string): Promise<Transaction | null> {
    return this.transactionModel.findById(id).exec();
  }

  async findByTransactionId(transactionId: string): Promise<Transaction | null> {
    return this.transactionModel.findOne({ transactionId }).exec();
  }

  async findByMerchantRef(merchantReference: string): Promise<Transaction | null> {
    return this.transactionModel.findOne({ merchantReference }).exec();
  }

  async updateById(id: string, dto: UpdateTransactionDto): Promise<Transaction> {
    const transaction = await this.transactionModel
      .findByIdAndUpdate(id, { ...dto, updatedAt: new Date() }, { new: true })
      .exec();

    if (!transaction) {
      throw new TransactionNotFoundException(`Transaction with ID ${id} not found`);
    }

    return transaction;
  }

  async updateByTransactionId(
    transactionId: string,
    dto: UpdateTransactionDto,
  ): Promise<Transaction> {
    const transaction = await this.transactionModel
      .findOneAndUpdate({ transactionId }, { ...dto, updatedAt: new Date() }, { new: true })
      .exec();

    if (!transaction) {
      throw new TransactionNotFoundException(`Transaction with ID ${transactionId} not found`);
    }

    return transaction;
  }

  async updateStatus(
    transactionId: string,
    status: TransactionStatus,
    errorMessage?: string,
  ): Promise<Transaction> {
    const updateData: UpdateTransactionDto = {
      status,
      errorMessage,
      updatedAt: new Date(),
    };

    if (status === TransactionStatus.SUCCESS || status === TransactionStatus.FAILED) {
      updateData.completedAt = new Date();
    }

    return this.updateByTransactionId(transactionId, updateData);
  }

  async findPending(limit = 100): Promise<Transaction[]> {
    return this.transactionModel
      .find({ status: TransactionStatus.PENDING })
      .sort({ createdAt: 1 })
      .limit(limit)
      .exec();
  }

  async findByStatus(status: TransactionStatus, limit = 100): Promise<Transaction[]> {
    return this.transactionModel.find({ status }).sort({ createdAt: -1 }).limit(limit).exec();
  }

  async findByPhoneNumber(phoneNumber: string, limit = 50): Promise<Transaction[]> {
    return this.transactionModel.find({ phoneNumber }).sort({ createdAt: -1 }).limit(limit).exec();
  }

  async exists(merchantReference: string): Promise<boolean> {
    const count = await this.transactionModel.countDocuments({ merchantReference }).exec();
    return count > 0;
  }
}

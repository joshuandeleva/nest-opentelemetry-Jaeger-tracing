import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';

import { Transaction, TransactionSchema } from './database/schemas/transaction.schema';
import { IdempotencyKey, IdempotencyKeySchema } from './database/schemas/idempotency.schema';

import { TransactionRepository } from './database/repositories/transaction.repository';
import { IdempotencyRepository } from './database/repositories/idempotency.repository';

import { HttpService } from './providers/http/http.service';
import { AuthService } from './providers/auth/auth.service';
import { RequestMapper } from './providers/mappers/request.mapper';
import { ResponseMapper } from './providers/mappers/response.mapper';
import { SasaPayProvider } from './providers/sasapay.provider';

import { PaymentQueueModule } from './queue/payment-queue.module';
import { C2BProcessor } from './queue/processors/c2b.processor';
import { B2CProcessor } from './queue/processors/b2c.processor';
import { B2BProcessor } from './queue/processors/b2b.processor';

import { PaymentsService } from './services/payments.service';

import { PaymentsController } from './payments.controller';

import { WebhooksController } from './webhooks/webhooks.controller';
import { WebhooksService } from './webhooks/webhooks.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),

    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
      { name: IdempotencyKey.name, schema: IdempotencyKeySchema },
    ]),

    PaymentQueueModule,
  ],
  controllers: [PaymentsController, WebhooksController],
  providers: [
    TransactionRepository,
    IdempotencyRepository,

    HttpService,
    AuthService,
    RequestMapper,
    ResponseMapper,
    SasaPayProvider,

    C2BProcessor,
    B2CProcessor,
    B2BProcessor,

    PaymentsService,
    WebhooksService,
  ],
  exports: [PaymentsService, TransactionRepository],
})
export class PaymentsModule {}

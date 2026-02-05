import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QUEUE_NAMES } from './queue.constants';

export { QUEUE_NAMES };

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          url: configService.get<string>('redis.url'),
          maxRetriesPerRequest: null,
        },
        defaultJobOptions: {
          attempts: configService.get<number>('queue.maxRetries') || 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: {
            age: 24 * 3600,
            count: 1000,
          },
          removeOnFail: {
            age: 7 * 24 * 3600,
          },
        },
      }),
    }),

    BullModule.registerQueue(
      { name: QUEUE_NAMES.C2B },
      { name: QUEUE_NAMES.B2C },
      { name: QUEUE_NAMES.B2B },
    ),
  ],
  exports: [BullModule],
})
export class PaymentQueueModule {}

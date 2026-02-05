import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { PinoLogger } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule as AppConfigModule } from './config/config.module';
import { LoggerModule } from './common/logger/logger.module';
import { RedisModule } from './common/redis/redis.module';
import { TracingModule } from './common/tracing/tracing.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    AppConfigModule,

    LoggerModule,

    TracingModule,

    RedisModule,

    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            name: 'short',
            ttl: configService.get<number>('rateLimit.shortTtl') || 1000,
            limit: configService.get<number>('rateLimit.shortLimit') || 10,
          },
          {
            name: 'long',
            ttl: configService.get<number>('rateLimit.longTtl') || 60000,
            limit: configService.get<number>('rateLimit.longLimit') || 100,
          },
        ],
      }),
    }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('database.url'),
        retryWrites: true,
        w: 'majority',
        connectionFactory: (connection: Connection) => {
          connection.on('connected', () => {
            console.log('MongoDB connected successfully');
          });
          connection.on('disconnected', () => {
            console.log('MongoDB disconnected');
          });
          connection.on('error', (error) => {
            console.error('MongoDB connection error:', error);
          });
          return connection;
        },
      }),
    }),

    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnModuleInit {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AppModule.name);
  }

  onModuleInit() {
    const dbState = this.connection.readyState;
    const states: Record<number, string> = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };

    this.logger.info(
      {
        database: this.connection.name,
        state: states[dbState] || 'unknown',
        host: this.connection.host,
        port: this.connection.port,
      },
      `Database connection status: ${states[dbState]}`,
    );
  }
}

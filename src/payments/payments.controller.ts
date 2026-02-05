import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
  Query,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { PaymentsService } from './services/payments.service';
import {
  C2BPaymentDto,
  B2CPaymentDto,
  B2BPaymentDto,
  PaymentResponseDto,
  BalanceResponseDto,
  TokenResponseDto,
} from './services/dto/payment.dto';
import { TransactionStatusResponse } from './providers/mappers/response.mapper';
import { IdempotencyKeyGuard } from '../common/guards/idempotency-key.guard';
import { IdempotencyInterceptor } from '../common/interceptors/idempotency.interceptor';

@Controller('payments')
@UseGuards(ThrottlerGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('c2b')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(IdempotencyKeyGuard)
  @UseInterceptors(IdempotencyInterceptor)
  async initiateC2BPayment(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: C2BPaymentDto,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.initiateC2BPayment(dto);
  }

  @Post('b2c')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(IdempotencyKeyGuard)
  @UseInterceptors(IdempotencyInterceptor)
  async initiateB2CPayment(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: B2CPaymentDto,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.initiateB2CPayment(dto);
  }

  @Post('b2b')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(IdempotencyKeyGuard)
  @UseInterceptors(IdempotencyInterceptor)
  async initiateB2BTransfer(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: B2BPaymentDto,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.initiateB2BTransfer(dto);
  }

  @Post('status')
  @HttpCode(HttpStatus.OK)
  async getTransactionStatus(
    @Body('MerchantCode') merchantCode: string,
    @Body('CheckoutRequestID') checkoutRequestId?: string,
    @Body('MerchantTransactionReference') merchantReference?: string,
  ): Promise<TransactionStatusResponse> {
    return this.paymentsService.getTransactionStatus(
      merchantCode,
      checkoutRequestId,
      merchantReference,
    );
  }

  @Get('balance')
  @HttpCode(HttpStatus.OK)
  async getBalance(@Query('MerchantCode') merchantCode: string): Promise<BalanceResponseDto> {
    return this.paymentsService.getBalance(merchantCode);
  }

  @Post('auth/token')
  @HttpCode(HttpStatus.OK)
  async generateToken(): Promise<TokenResponseDto> {
    return this.paymentsService.generateToken();
  }
}

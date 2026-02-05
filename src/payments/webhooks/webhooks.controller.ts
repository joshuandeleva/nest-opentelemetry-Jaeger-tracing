import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  ValidationPipe,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebhooksService } from './webhooks.service';
import { SignatureGuard } from './guards/signature.guard';
import { WebhookPayloadDto, WebhookResponseDto } from './dto/webhook.dto';

@Controller('webhooks')
export class WebhooksController {
  private readonly internalApiKey: string;

  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly configService: ConfigService,
  ) {
    this.internalApiKey = this.configService.get<string>('INTERNAL_API_KEY') || '';
  }

  @Post('sasapay')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SignatureGuard)
  async handleSasaPayCallback(
    @Body(new ValidationPipe({ transform: true }))
    payload: WebhookPayloadDto,
  ): Promise<WebhookResponseDto> {
    return this.webhooksService.processCallback(payload);
  }

  @Post('callback')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SignatureGuard)
  async handleCallback(
    @Body(new ValidationPipe({ transform: true }))
    payload: WebhookPayloadDto,
  ): Promise<WebhookResponseDto> {
    return this.webhooksService.processCallback(payload);
  }

  @Post('internal')
  @HttpCode(HttpStatus.OK)
  async handleInternalCallback(
    @Headers('x-internal-key') apiKey: string,
    @Body(new ValidationPipe({ transform: true }))
    payload: WebhookPayloadDto,
  ): Promise<WebhookResponseDto> {
    if (!this.internalApiKey || apiKey !== this.internalApiKey) {
      throw new UnauthorizedException('Invalid internal API key');
    }
    return this.webhooksService.processCallback(payload);
  }
}

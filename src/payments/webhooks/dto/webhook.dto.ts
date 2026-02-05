import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class WebhookPayloadDto {
  @IsOptional()
  @IsString()
  MerchantCode?: string;

  // C2B/B2C callback field
  @IsOptional()
  @IsString()
  MerchantRequestID?: string;

  // Status query callback field
  @IsOptional()
  @IsString()
  MerchantReference?: string;

  @IsOptional()
  @IsString()
  CheckoutRequestID?: string;

  @IsOptional()
  @IsString()
  CheckoutId?: string;

  @IsOptional()
  @IsString()
  PaymentRequestID?: string;

  @IsOptional()
  @IsString()
  ResultCode?: string;

  // C2B/B2C callback field
  @IsOptional()
  @IsString()
  ResultDesc?: string;

  // Status query callback field
  @IsOptional()
  @IsString()
  ResultDescription?: string;

  @IsOptional()
  @IsString()
  Amount?: string;

  @IsOptional()
  @IsString()
  TransactionDate?: string;

  @IsOptional()
  @IsString()
  PhoneNumber?: string;

  @IsOptional()
  @IsString()
  ReceiptNumber?: string;

  @IsOptional()
  @IsString()
  TransactionStatus?: string;

  @IsOptional()
  @IsString()
  TransactionType?: string;

  @IsOptional()
  @IsString()
  timestamp?: string;

  @IsOptional()
  @IsString()
  Timestamp?: string;

  @IsOptional()
  @IsString()
  SourceChannel?: string;

  @IsOptional()
  @IsString()
  DestinationChannel?: string;

  @IsOptional()
  @IsString()
  TransAmount?: string;

  @IsOptional()
  @IsString()
  RequestedAmount?: string;

  @IsOptional()
  @IsBoolean()
  Paid?: boolean;

  @IsOptional()
  @IsBoolean()
  IsReversed?: boolean;

  @IsOptional()
  @IsString()
  PaidAmount?: string;

  @IsOptional()
  @IsString()
  PaidDate?: string;

  @IsOptional()
  @IsString()
  BillRefNumber?: string;

  @IsOptional()
  @IsString()
  CustomerMobile?: string;

  @IsOptional()
  @IsString()
  TransactionCode?: string;

  @IsOptional()
  @IsString()
  TransID?: string;

  @IsOptional()
  @IsString()
  ThirdPartyTransID?: string;

  @IsOptional()
  @IsString()
  ThirdPartyTransactionCode?: string;

  @IsOptional()
  @IsString()
  ReversalTransactionCode?: string;
}

export class WebhookResponseDto {
  success: boolean;
  message: string;
}

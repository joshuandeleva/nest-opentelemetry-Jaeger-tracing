import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsPositive,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator';

export class C2BPaymentDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^(\+?254|0)?[17]\d{8}$/, {
    message: 'Phone number must be a valid Kenyan phone number',
  })
  phoneNumber: string;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  merchantReference: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  networkCode?: string;

  @IsOptional()
  @IsString()
  callbackUrl?: string;
}

export class B2CPaymentDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^(\+?254|0)?[17]\d{8}$/, {
    message: 'Phone number must be a valid Kenyan phone number',
  })
  phoneNumber: string;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  merchantReference: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsString()
  callbackUrl?: string;
}

export class B2BPaymentDto {
  @IsNotEmpty()
  @IsString()
  receiverMerchantCode: string;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  merchantReference: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  callbackUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  accountReference?: string;

  @IsNotEmpty()
  @IsString()
  receiverAccountType: string;

  @IsNotEmpty()
  @IsString()
  networkCode: string;
}

export class PaymentResponseDto {
  transactionId: string;
  merchantReference: string;
  status: string;
  message: string;
}

export class BalanceResponseDto {
  success: boolean;
  balance?: number;
  currency: string;
  message: string;
}

export class TransactionStatusDto {
  transactionId: string;
  merchantReference: string;
  status: string;
  amount: number;
  currency: string;
  phoneNumber?: string;
  receiptNumber?: string;
  createdAt: Date;
  completedAt?: Date;
  errorMessage?: string;
}

export class TokenResponseDto {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  generatedAt: Date;
}

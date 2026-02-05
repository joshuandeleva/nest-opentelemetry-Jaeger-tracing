export interface SasaPayC2BRequestDto {
  MerchantCode: string;
  NetworkCode: string;
  PhoneNumber: string;
  TransactionDesc: string;
  AccountReference: string;
  Currency: string;
  Amount: string;
  CallBackURL: string;
}

export interface SasaPayB2CRequestDto {
  MerchantCode: string;
  MerchantTransactionReference: string;
  Currency: string;
  Amount: string;
  ReceiverNumber: string;
  Channel: string;
  CallBackURL: string;
  Reason: string;
}

export interface SasaPayB2BRequestDto {
  MerchantCode: string;
  MerchantTransactionReference: string;
  Currency: string;
  Amount: string;
  ReceiverMerchantCode: string;
  AccountReference?: string;
  ReceiverAccountType: string;
  NetworkCode: string;
  CallBackURL: string;
  Reason: string;
}

export interface SasaPayBalanceRequestDto {
  MerchantCode: string;
}

export interface SasaPayTransactionStatusRequestDto {
  MerchantCode: string;
  CheckoutRequestID?: string;
  MerchantTransactionReference?: string;
  CallbackUrl: string;
}

export interface SasaPayBaseResponseDto {
  status: boolean;
  detail?: string;
  message?: string;
}

export interface SasaPayC2BResponseDto extends SasaPayBaseResponseDto {
  MerchantRequestID?: string;
  CheckoutRequestID?: string;
  ResponseDescription?: string;
  CustomerMessage?: string;
}

export interface SasaPayB2CResponseDto extends SasaPayBaseResponseDto {
  MerchantRequestID?: string;
  ResponseDescription?: string;
}

export interface SasaPayB2BResponseDto extends SasaPayBaseResponseDto {
  MerchantRequestID?: string;
  ResponseDescription?: string;
}

export interface SasaPayBalanceResponseDto extends SasaPayBaseResponseDto {
  Balance?: number;
  Currency?: string;
}

export interface SasaPayTransactionStatusResponseDto {
  ResultCode: string;
  ResultDescription: string;
  TransactionType: string;
  TransactionDate: string;
  CheckoutId: string;
  CheckoutRequestID: string;
  MerchantReference: string;
  RequestedAmount: string;
  Paid: boolean;
  IsReversed: boolean;
  PaidAmount: string;
  PaidDate: string;
  SourceChannel: string;
  DestinationChannel: string;
  TransID: string;
  TransactionCode: string;
  ThirdPartyTransactionCode: string;
  ReversalTransactionCode: string;
}

export interface SasaPayWebhookPayloadDto {
  MerchantCode?: string;
  MerchantRequestID?: string;
  MerchantReference?: string;
  CheckoutRequestID?: string;
  CheckoutId?: string;
  PaymentRequestID?: string;
  ResultCode?: string;
  ResultDesc?: string;
  ResultDescription?: string;
  Amount?: string;
  TransactionDate?: string;
  PhoneNumber?: string;
  ReceiptNumber?: string;
  TransactionStatus?: string;
  TransactionType?: string;
  SourceChannel?: string;
  DestinationChannel?: string;
  TransAmount?: string;
  RequestedAmount?: string;
  Paid?: boolean;
  IsReversed?: boolean;
  PaidAmount?: string;
  PaidDate?: string;
  BillRefNumber?: string;
  CustomerMobile?: string;
  TransactionCode?: string;
  TransID?: string;
  ThirdPartyTransID?: string;
  ThirdPartyTransactionCode?: string;
  ReversalTransactionCode?: string;
}

export enum SasaPayNetworkCode {
  MPESA = '63902',
  AIRTEL = '63903',
  TKASH = '63907',
}

export enum SasaPayChannel {
  MPESA = '63902',
  AIRTEL = '63903',
  BANK = 'BANK',
}

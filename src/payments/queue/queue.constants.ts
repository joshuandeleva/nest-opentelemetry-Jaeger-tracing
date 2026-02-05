export const QUEUE_NAMES = {
  C2B: 'c2b-payments',
  B2C: 'b2c-payments',
  B2B: 'b2b-payments',
} as const;

export const JOB_NAMES = {
  C2B_PAYMENT: 'c2b-payment',
  B2C_PAYMENT: 'b2c-payment',
  B2B_TRANSFER: 'b2b-transfer',
} as const;

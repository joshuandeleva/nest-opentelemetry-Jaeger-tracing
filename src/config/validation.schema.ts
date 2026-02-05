import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // Environment
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),

  // MongoDB
  MONGO_URL: Joi.string().required(),

  // Redis
  REDIS_URL: Joi.string().uri().required(),

  // SasaPay API
  SASAPAY_CLIENT_ID: Joi.string().required(),
  SASAPAY_CLIENT_SECRET: Joi.string().required(),
  SASAPAY_MERCHANT_CODE: Joi.string().required(),
  SASAPAY_API_BASE_URL: Joi.string().uri().required(),
  SASAPAY_AUTH_URL: Joi.string().uri().required(),
  SASAPAY_WEBHOOK_SECRET: Joi.string().required(),
  SASAPAY_CALLBACK_URL: Joi.string().uri().required(),

  // Queue Configuration
  QUEUE_CONCURRENCY: Joi.number().default(5),
  QUEUE_MAX_RETRIES: Joi.number().default(3),

  // Idempotency
  IDEMPOTENCY_TTL: Joi.number().default(86400), // 24 hours in seconds
  IDEMPOTENCY_HEADER: Joi.string().default('Idempotency-Key'),

  // Logging
  LOG_LEVEL: Joi.string().valid('debug', 'info', 'warn', 'error').default('info'),
  LOG_PRETTY: Joi.string().valid('true', 'false').default('true'),

  // OpenTelemetry Tracing
  OTEL_ENABLED: Joi.string().valid('true', 'false').default('false'),
  OTEL_SERVICE_NAME: Joi.string().default('sasapay-service'),
  OTEL_EXPORTER_OTLP_ENDPOINT: Joi.string().default('http://localhost:4318/v1/traces'),
});

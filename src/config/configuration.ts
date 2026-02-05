export default () => ({
  environment: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),

  database: {
    url: process.env.MONGO_URL,
  },

  redis: {
    url: process.env.REDIS_URL,
  },

  sasapay: {
    clientId: process.env.SASAPAY_CLIENT_ID,
    clientSecret: process.env.SASAPAY_CLIENT_SECRET,
    merchantCode: process.env.SASAPAY_MERCHANT_CODE,
    baseUrl: process.env.SASAPAY_API_BASE_URL,
    authUrl: process.env.SASAPAY_AUTH_URL,
    webhookSecret: process.env.SASAPAY_WEBHOOK_SECRET,
    callbackUrl: process.env.SASAPAY_CALLBACK_URL,
  },

  queue: {
    concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '5', 10),
    maxRetries: parseInt(process.env.QUEUE_MAX_RETRIES || '3', 10),
  },

  idempotency: {
    ttl: parseInt(process.env.IDEMPOTENCY_TTL || '86400', 10), // 24 hours
    header: process.env.IDEMPOTENCY_HEADER || 'Idempotency-Key',
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    pretty: process.env.LOG_PRETTY === 'true',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },

  rateLimit: {
    shortTtl: parseInt(process.env.RATE_LIMIT_SHORT_TTL || '1000', 10),
    shortLimit: parseInt(process.env.RATE_LIMIT_SHORT_LIMIT || '10', 10),
    longTtl: parseInt(process.env.RATE_LIMIT_LONG_TTL || '60000', 10),
    longLimit: parseInt(process.env.RATE_LIMIT_LONG_LIMIT || '100', 10),
  },

  tracing: {
    enabled: process.env.OTEL_ENABLED === 'true',
    serviceName: process.env.OTEL_SERVICE_NAME || 'sasapay-service',
    exporterEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  },
});

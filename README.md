# SasaPay Payment Service

A NestJS-based payment integration service for SasaPay mobile money APIs. Provides a unified interface for C2B (Customer to Business), B2C (Business to Customer), and B2B (Business to Business) payment operations.

## Table of Contents

- [Architecture](#architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Webhooks](#webhooks)
- [Queue Processing](#queue-processing)
- [Observability](#observability)
- [Development](#development)

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           SasaPay Service                                │
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐               │
│  │  Controller  │───▶│   Service    │───▶│  BullMQ      │               │
│  │  (HTTP API)  │    │  (Business)  │    │  (Queue)     │               │
│  └──────────────┘    └──────────────┘    └──────┬───────┘               │
│         │                                        │                       │
│         │                                        ▼                       │
│         │                              ┌──────────────┐                  │
│         │                              │  Processor   │                  │
│         │                              │  (Worker)    │                  │
│         │                              └──────┬───────┘                  │
│         │                                     │                          │
│         ▼                                     ▼                          │
│  ┌──────────────┐                    ┌──────────────┐                   │
│  │   MongoDB    │◀───────────────────│ SasaPay API  │                   │
│  │ (Transactions)│                   │  (External)  │                   │
│  └──────────────┘                    └──────────────┘                   │
│                                              │                           │
│                                              ▼                           │
│                                      ┌──────────────┐                   │
│                                      │  Callback    │                   │
│                                      │  (Webhook)   │                   │
│                                      └──────────────┘                   │
└─────────────────────────────────────────────────────────────────────────┘
```

## Features

- **Payment Operations**: C2B, B2C, and B2B payment support
- **Async Processing**: BullMQ-based job queue for reliable payment processing
- **Idempotency**: Built-in idempotency support to prevent duplicate transactions
- **Webhook Handling**: Secure webhook endpoint for SasaPay callbacks
- **Rate Limiting**: Configurable rate limiting with throttler
- **Observability**: OpenTelemetry tracing with Jaeger integration
- **Structured Logging**: Pino-based logging with trace correlation
- **Security**: Helmet middleware, webhook signature verification

## Tech Stack

### Core Framework

| Package    | Version | Purpose               |
| ---------- | ------- | --------------------- |
| NestJS     | 11.x    | Application framework |
| TypeScript | 5.x     | Type-safe development |

### Database & Cache

| Package  | Version | Purpose      |
| -------- | ------- | ------------ |
| Mongoose | 9.x     | MongoDB ODM  |
| ioredis  | 5.x     | Redis client |
| BullMQ   | 5.x     | Job queue    |

### Observability

| Package           | Version | Purpose             |
| ----------------- | ------- | ------------------- |
| OpenTelemetry SDK | 0.211.x | Distributed tracing |
| nestjs-pino       | 4.x     | Structured logging  |
| pino-pretty       | 13.x    | Log formatting      |

### Security & Validation

| Package           | Version | Purpose                |
| ----------------- | ------- | ---------------------- |
| helmet            | 8.x     | Security headers       |
| class-validator   | 0.14.x  | DTO validation         |
| class-transformer | 0.5.x   | Object transformation  |
| joi               | 17.x    | Environment validation |

### HTTP & API

| Package           | Version | Purpose           |
| ----------------- | ------- | ----------------- |
| axios             | 1.x     | HTTP client       |
| @nestjs/swagger   | 8.x     | API documentation |
| @nestjs/throttler | 6.x     | Rate limiting     |

## Project Structure

```
src/
├── main.ts                          # Application entry point
├── tracing.ts                       # OpenTelemetry bootstrap
├── app.module.ts                    # Root module
├── config/
│   ├── config.module.ts             # Configuration module
│   ├── configuration.ts             # Config factory
│   └── validation.schema.ts         # Env validation
├── common/
│   ├── filters/
│   │   └── http-exception.filter.ts # Global exception filter
│   ├── guards/
│   │   └── idempotency-key.guard.ts # Idempotency enforcement
│   ├── interceptors/
│   │   └── idempotency.interceptor.ts
│   ├── logger/
│   │   ├── logger.module.ts         # Pino logger setup
│   │   └── logger.service.ts
│   ├── redis/
│   │   └── redis.module.ts          # Redis connection
│   └── tracing/
│       ├── tracing.module.ts        # Tracing module
│       ├── tracing.service.ts       # Custom span helpers
│       └── bullmq-propagation.ts    # Queue context propagation
└── payments/
    ├── payments.module.ts           # Payments feature module
    ├── payments.controller.ts       # HTTP endpoints
    ├── services/
    │   ├── payments.service.ts      # Business logic
    │   └── dto/
    │       └── payment.dto.ts       # Request/Response DTOs
    ├── providers/
    │   ├── sasapay.provider.ts      # SasaPay API client
    │   ├── auth/
    │   │   └── auth.service.ts      # Token management
    │   ├── http/
    │   │   └── http.service.ts      # HTTP wrapper
    │   ├── mappers/
    │   │   ├── request.mapper.ts    # Request transformation
    │   │   └── response.mapper.ts   # Response transformation
    │   └── dto/
    │       └── sasapay.dto.ts       # SasaPay API DTOs
    ├── database/
    │   ├── schemas/
    │   │   ├── transaction.schema.ts
    │   │   └── idempotency.schema.ts
    │   └── repositories/
    │       ├── transaction.repository.ts
    │       └── idempotency.repository.ts
    ├── queue/
    │   ├── payment-queue.module.ts  # Queue configuration
    │   ├── queue.constants.ts       # Queue names
    │   ├── dto/
    │   │   └── payment-job.dto.ts   # Job data types
    │   └── processors/
    │       ├── c2b.processor.ts     # C2B job handler
    │       ├── b2c.processor.ts     # B2C job handler
    │       └── b2b.processor.ts     # B2B job handler
    ├── webhooks/
    │   ├── webhooks.controller.ts   # Webhook endpoints
    │   ├── webhooks.service.ts      # Callback processing
    │   ├── guards/
    │   │   └── signature.guard.ts   # Signature verification
    │   └── dto/
    │       └── webhook.dto.ts       # Webhook payload
    └── exceptions/
        ├── payment.exception.ts
        ├── authentication.exception.ts
        └── webhook.exception.ts
```

## Installation

```bash
# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Start infrastructure (MongoDB, Redis, Jaeger)
docker compose up -d

# Run in development
pnpm start:dev

# Build for production
pnpm build

# Run production
pnpm start:prod
```

## Configuration

### Environment Variables

```env
# Server
NODE_ENV=development
PORT=3000

# MongoDB
MONGO_URL=mongodb://localhost:27017/sasapay

# Redis
REDIS_URL=redis://localhost:6379

# SasaPay API
SASAPAY_CLIENT_ID=your-client-id
SASAPAY_CLIENT_SECRET=your-client-secret
SASAPAY_MERCHANT_CODE=your-merchant-code
SASAPAY_API_BASE_URL=https://sandbox.sasapay.app/api/v1
SASAPAY_AUTH_URL=https://sandbox.sasapay.app/api/v1/auth/token/
SASAPAY_WEBHOOK_SECRET=your-webhook-secret
SASAPAY_CALLBACK_URL=https://your-domain.com/api/v1/webhooks/sasapay

# Queue
QUEUE_CONCURRENCY=5
QUEUE_MAX_RETRIES=3

# Idempotency
IDEMPOTENCY_TTL=86400
IDEMPOTENCY_HEADER=Idempotency-Key

# Logging
LOG_LEVEL=info
LOG_PRETTY=true

# Rate Limiting
RATE_LIMIT_SHORT_TTL=1000
RATE_LIMIT_SHORT_LIMIT=10
RATE_LIMIT_LONG_TTL=60000
RATE_LIMIT_LONG_LIMIT=100

# OpenTelemetry
OTEL_ENABLED=true
OTEL_SERVICE_NAME=sasapay-service
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
```

## API Reference

Base URL: `http://localhost:3000/api/v1`

### Payment Endpoints

#### C2B Payment (Customer to Business)

Initiates an STK push to customer's phone.

```http
POST /payments/c2b
Content-Type: application/json
Idempotency-Key: unique-request-id

{
  "phoneNumber": "254712345678",
  "amount": 100,
  "merchantReference": "INV-001",
  "description": "Payment for order",
  "currency": "KES",
  "networkCode": "63902",
  "callbackUrl": "https://your-domain.com/callback"
}
```

**Response (202 Accepted):**

```json
{
  "transactionId": "uuid-v4",
  "merchantReference": "INV-001",
  "status": "PENDING",
  "message": "Payment request queued for processing"
}
```

#### B2C Payment (Business to Customer)

Sends money to customer's phone.

```http
POST /payments/b2c
Content-Type: application/json
Idempotency-Key: unique-request-id

{
  "phoneNumber": "254712345678",
  "amount": 500,
  "merchantReference": "PAYOUT-001",
  "reason": "Salary payment",
  "currency": "KES",
  "channel": "MPESA",
  "callbackUrl": "https://your-domain.com/callback"
}
```

#### B2B Transfer (Business to Business)

Transfers money between businesses.

```http
POST /payments/b2b
Content-Type: application/json
Idempotency-Key: unique-request-id

{
  "receiverMerchantCode": "123456",
  "amount": 10000,
  "merchantReference": "TRANSFER-001",
  "reason": "Supplier payment",
  "currency": "KES",
  "receiverAccountType": "PAYBILL",
  "networkCode": "63902",
  "accountReference": "ACC-001",
  "callbackUrl": "https://your-domain.com/callback"
}
```

#### Transaction Status

Query transaction status from SasaPay.

```http
POST /payments/status
Content-Type: application/json

{
  "MerchantCode": "123456",
  "CheckoutRequestID": "ws_CO_123456",
  "MerchantTransactionReference": "INV-001"
}
```

#### Account Balance

Get merchant account balance.

```http
GET /payments/balance?MerchantCode=123456
```

**Response:**

```json
{
  "success": true,
  "balance": 50000.0,
  "currency": "KES",
  "message": "Success"
}
```

#### Generate Token

Generate SasaPay access token.

```http
POST /payments/auth/token
```

**Response:**

```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIs...",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "generatedAt": "2024-01-15T10:30:00.000Z"
}
```

## Webhooks

### SasaPay Callback (with signature verification)

```http
POST /webhooks/sasapay
X-Sasapay-Signature: sha256=...
```

### Internal Callback (for forwarding from your service)

```http
POST /webhooks/internal
X-Internal-Key: your-internal-api-key
```

### Webhook Payload Structure

```json
{
  "MerchantCode": "123456",
  "MerchantRequestID": "uuid",
  "CheckoutRequestID": "ws_CO_123456",
  "ResultCode": "0",
  "ResultDesc": "Success",
  "TransactionStatus": "SUCCESS",
  "Amount": "100.00",
  "TransactionDate": "2024-01-15 10:30:00",
  "PhoneNumber": "254712345678",
  "ReceiptNumber": "ABC123XYZ",
  "Paid": true
}
```

## Queue Processing

Payment requests are processed asynchronously using BullMQ:

| Queue          | Job Name       | Purpose                  |
| -------------- | -------------- | ------------------------ |
| `c2b-payment`  | `c2b-payment`  | Process C2B STK push     |
| `b2c-payment`  | `b2c-payment`  | Process B2C disbursement |
| `b2b-transfer` | `b2b-transfer` | Process B2B transfer     |

### Job Flow

1. Controller receives request → validates → creates transaction in DB
2. Job added to queue with trace context
3. Processor picks up job → calls SasaPay API
4. Transaction updated with response
5. Webhook received → final status update

### Retry Policy

- 4xx errors: No retry (UnrecoverableError)
- 5xx errors: Retry up to `QUEUE_MAX_RETRIES` times

## Observability

### Tracing with Jaeger

Start Jaeger:

```bash
docker compose up jaeger -d
```

Enable tracing:

```env
OTEL_ENABLED=true
```

View traces: http://localhost:16686

### What Gets Traced

| Component          | Span Name                        | Type   |
| ------------------ | -------------------------------- | ------ |
| HTTP requests      | `HTTP {method} {path}`           | Auto   |
| NestJS handlers    | Controller/Service spans         | Auto   |
| MongoDB operations | `mongodb.{operation}`            | Auto   |
| Redis operations   | `redis.{command}`                | Auto   |
| BullMQ processing  | `bullmq.{c2b\|b2c\|b2b}.process` | Manual |
| External HTTP      | HTTP client spans                | Auto   |

### Log Correlation

Logs include `trace_id` and `span_id` for correlation:

```json
{
  "level": "info",
  "trace_id": "abc123...",
  "span_id": "def456...",
  "msg": "Processing C2B payment job"
}
```

## Development

### Scripts

```bash
# Development with hot reload
pnpm start:dev

# Run tests
pnpm test

# Run e2e tests
pnpm test:e2e

# Lint and fix
pnpm lint

# Format code
pnpm format

# Build
pnpm build
```

### Docker Compose Services

```bash
# Start all services
docker compose up -d

# Start specific services
docker compose up jaeger redis -d

# View logs
docker compose logs -f jaeger
```

| Service     | Port  | Purpose             |
| ----------- | ----- | ------------------- |
| MongoDB     | 27017 | Database            |
| Redis       | 6379  | Cache & Queue       |
| Jaeger UI   | 16686 | Trace visualization |
| Jaeger OTLP | 4318  | Trace ingestion     |

## Transaction States

```
PENDING → PROCESSING → SUCCESS
                    ↘ FAILED
                    ↘ CANCELLED
```

| Status       | Description                                |
| ------------ | ------------------------------------------ |
| `PENDING`    | Transaction created, queued for processing |
| `PROCESSING` | Request sent to SasaPay, awaiting callback |
| `SUCCESS`    | Payment completed successfully             |
| `FAILED`     | Payment failed (see errorMessage)          |
| `CANCELLED`  | Payment cancelled by user                  |

## License

UNLICENSED

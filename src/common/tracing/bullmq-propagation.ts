import { context, propagation, trace, Span, SpanKind } from '@opentelemetry/api';

export interface TraceCarrier {
  traceparent?: string;
  tracestate?: string;
}

export function injectTraceContext(): TraceCarrier {
  const carrier: TraceCarrier = {};
  propagation.inject(context.active(), carrier);
  return carrier;
}

export function extractTraceContext(carrier: TraceCarrier) {
  return propagation.extract(context.active(), carrier);
}

export function createJobSpan(
  spanName: string,
  carrier: TraceCarrier,
  attributes?: Record<string, string | number | boolean>,
): Span {
  const tracer = trace.getTracer('sasapay-service');
  const extractedContext = extractTraceContext(carrier);

  return tracer.startSpan(
    spanName,
    {
      kind: SpanKind.CONSUMER,
      attributes,
    },
    extractedContext,
  );
}

export function runWithSpan<T>(span: Span, fn: () => T): T {
  return context.with(trace.setSpan(context.active(), span), fn);
}

export async function runWithSpanAsync<T>(span: Span, fn: () => Promise<T>): Promise<T> {
  return context.with(trace.setSpan(context.active(), span), fn);
}

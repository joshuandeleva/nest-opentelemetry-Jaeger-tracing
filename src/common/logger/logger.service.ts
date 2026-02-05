import { Injectable, Scope } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService {
  constructor(private readonly logger: PinoLogger) {}

  setContext(context: string) {
    this.logger.setContext(context);
  }

  debug(message: string, ...args: unknown[]) {
    this.logger.debug(message, ...args);
  }

  info(message: string, ...args: unknown[]) {
    this.logger.info(message, ...args);
  }

  warn(message: string, ...args: unknown[]) {
    this.logger.warn(message, ...args);
  }

  error(message: string, trace?: string, context?: Record<string, unknown>) {
    this.logger.error({ trace, ...context }, message);
  }

  log(message: string, ...args: unknown[]) {
    this.logger.info(message, ...args);
  }
}

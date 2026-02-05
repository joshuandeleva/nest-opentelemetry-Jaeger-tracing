import { Injectable, HttpException, HttpStatus, OnModuleInit } from '@nestjs/common';
import { HttpService as NestHttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { AxiosRequestConfig, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { firstValueFrom, catchError, timeout } from 'rxjs';
import { AuthService } from '../auth/auth.service';

export interface HttpRequestConfig extends AxiosRequestConfig {
  skipLogging?: boolean;
  skipAuth?: boolean;
}

@Injectable()
export class HttpService implements OnModuleInit {
  private readonly baseUrl: string;
  private readonly defaultTimeout: number;

  constructor(
    private readonly httpService: NestHttpService,
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(HttpService.name);
    this.baseUrl = this.configService.get<string>('sasapay.baseUrl') || '';
    this.defaultTimeout = 30000;
  }

  onModuleInit() {
    this.setupInterceptors();
  }

  private setupInterceptors() {
    const axiosInstance = this.httpService.axiosRef;

    axiosInstance.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        const skipAuth =
          config.url?.includes('/auth/token') || (config as HttpRequestConfig).skipAuth;

        if (skipAuth || config.headers?.Authorization) {
          return config;
        }

        try {
          const token = await this.authService.getAccessToken();
          config.headers.Authorization = `Bearer ${token}`;
          this.logger.info(
            { tokenPreview: `${token.substring(0, 20)}...`, url: config.url },
            'Added bearer token to request',
          );
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          this.logger.error({ error: error.message }, 'Failed to get access token');
          throw error;
        }

        return config;
      },
      (err: unknown) => {
        const error = err instanceof Error ? err : new Error(String(err));
        this.logger.error({ error: error.message }, 'Request interceptor error');
        return Promise.reject(error);
      },
    );

    axiosInstance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          this.logger.warn('Received 401, clearing token cache');
          this.authService.clearCache();
        }
        return Promise.reject(error);
      },
    );

    this.logger.info('HTTP interceptors configured');
  }

  async get<T>(url: string, config?: HttpRequestConfig): Promise<T> {
    return this.request<T>('GET', url, undefined, config);
  }

  async post<T>(url: string, data?: unknown, config?: HttpRequestConfig): Promise<T> {
    return this.request<T>('POST', url, data, config);
  }

  async put<T>(url: string, data?: unknown, config?: HttpRequestConfig): Promise<T> {
    return this.request<T>('PUT', url, data, config);
  }

  async delete<T>(url: string, config?: HttpRequestConfig): Promise<T> {
    return this.request<T>('DELETE', url, undefined, config);
  }

  private async request<T>(
    method: string,
    url: string,
    data?: unknown,
    config?: HttpRequestConfig,
  ): Promise<T> {
    const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
    const requestTimeout = config?.timeout || this.defaultTimeout;

    const requestConfig: HttpRequestConfig = {
      ...config,
      method,
      url: fullUrl,
      data,
      timeout: requestTimeout,
    };

    if (!config?.skipLogging) {
      this.logger.info(
        {
          method,
          url: fullUrl,
          requestBody: data,
        },
        'Making HTTP request',
      );
    }

    const startTime = Date.now();

    try {
      const response = await firstValueFrom(
        this.httpService.request<T>(requestConfig).pipe(
          timeout(requestTimeout),
          catchError((error: AxiosError) => {
            throw this.handleError(error, method, fullUrl);
          }),
        ),
      );

      const duration = Date.now() - startTime;

      if (!config?.skipLogging) {
        this.logger.debug(
          {
            method,
            url: fullUrl,
            statusCode: response.status,
            duration: `${duration}ms`,
          },
          'HTTP request completed',
        );
      }

      return response.data;
    } catch (error) {
      const duration = Date.now() - startTime;

      if (error instanceof HttpException) {
        this.logger.error(
          {
            method,
            url: fullUrl,
            statusCode: error.getStatus(),
            duration: `${duration}ms`,
            error: error.message,
          },
          'HTTP request failed',
        );
        throw error;
      }

      throw this.handleError(error as AxiosError, method, fullUrl);
    }
  }

  private handleError(error: AxiosError, method: string, url: string): HttpException {
    const response = error.response as AxiosResponse | undefined;

    if (response) {
      const statusCode = response.status;
      const errorData = response.data as Record<string, unknown>;

      this.logger.error(
        {
          method,
          url,
          statusCode,
          responseBody: errorData,
          errorMessage: errorData?.message || errorData?.detail || errorData?.error,
        },
        `HTTP request failed with status ${statusCode}`,
      );

      const errorMessage =
        (errorData?.message as string) ||
        (errorData?.detail as string) ||
        (errorData?.error as string) ||
        error.message;

      return new HttpException(
        {
          statusCode,
          message: errorMessage,
          error: errorData?.error || 'External API Error',
          details: errorData,
        },
        statusCode,
      );
    }

    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      this.logger.error({ method, url, error: 'Request timeout' }, 'HTTP request timed out');

      return new HttpException(
        {
          statusCode: HttpStatus.REQUEST_TIMEOUT,
          message: 'Request timed out',
          error: 'Gateway Timeout',
        },
        HttpStatus.REQUEST_TIMEOUT,
      );
    }

    if (error.code === 'ECONNREFUSED') {
      this.logger.error({ method, url, error: 'Connection refused' }, 'HTTP connection refused');

      return new HttpException(
        {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'Service unavailable',
          error: 'Connection Refused',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    this.logger.error(
      {
        method,
        url,
        error: error.message,
        code: error.code,
      },
      'HTTP request failed with network error',
    );

    return new HttpException(
      {
        statusCode: HttpStatus.BAD_GATEWAY,
        message: error.message || 'Network error',
        error: 'Bad Gateway',
      },
      HttpStatus.BAD_GATEWAY,
    );
  }
}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService as NestHttpService } from '@nestjs/axios';
import { PinoLogger } from 'nestjs-pino';
import { firstValueFrom } from 'rxjs';
import {
  AuthenticationException,
  InvalidCredentialsException,
} from '../../exceptions/authentication.exception';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface CachedToken {
  accessToken: string;
  tokenType: string;
  expiresAt: number;
  expiresIn: number;
  generatedAt: Date;
}

export interface TokenInfo {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  generatedAt: Date;
}

@Injectable()
export class AuthService {
  private cachedToken: CachedToken | null = null;
  private tokenRefreshPromise: Promise<string> | null = null;
  private readonly tokenBufferMs = 5 * 60 * 1000;

  private readonly authUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(
    private readonly httpService: NestHttpService,
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AuthService.name);
    this.authUrl = this.configService.get<string>('sasapay.authUrl') || '';
    this.clientId = this.configService.get<string>('sasapay.clientId') || '';
    this.clientSecret = this.configService.get<string>('sasapay.clientSecret') || '';
  }

  async getAccessToken(): Promise<string> {
    if (this.isTokenValid()) {
      this.logger.info('Using cached access token');
      return this.cachedToken!.accessToken;
    }

    if (this.tokenRefreshPromise) {
      this.logger.info('Token refresh already in progress, waiting...');
      return this.tokenRefreshPromise;
    }

    this.logger.info('No valid token, fetching new one from SasaPay');
    this.tokenRefreshPromise = this.refreshToken();

    try {
      const token = await this.tokenRefreshPromise;
      return token;
    } finally {
      this.tokenRefreshPromise = null;
    }
  }

  private isTokenValid(): boolean {
    if (!this.cachedToken) {
      return false;
    }

    const now = Date.now();
    const expiresAt = this.cachedToken.expiresAt - this.tokenBufferMs;

    return now < expiresAt;
  }

  private async refreshToken(): Promise<string> {
    this.logger.info({ authUrl: this.authUrl }, 'Refreshing SasaPay access token');

    if (!this.clientId || !this.clientSecret) {
      this.logger.error('SasaPay client credentials not configured');
      throw new InvalidCredentialsException('SasaPay client credentials not configured');
    }

    this.logger.info(
      { clientId: `${this.clientId.substring(0, 8)}...` },
      'Using client credentials for authentication',
    );

    try {
      const response = await firstValueFrom(
        this.httpService.get<TokenResponse>(this.authUrl, {
          params: {
            grant_type: 'client_credentials',
          },
          auth: {
            username: this.clientId,
            password: this.clientSecret,
          },
          timeout: 30000,
        }),
      );

      const { access_token, expires_in } = response.data;

      this.logger.info(
        {
          tokenPreview: access_token ? `${access_token.substring(0, 20)}...` : 'none',
          expiresIn: expires_in,
          tokenType: response.data.token_type,
        },
        'Received token response from SasaPay',
      );

      if (!access_token) {
        this.logger.error('No access token in SasaPay response');
        throw new AuthenticationException('No access token in response');
      }

      this.cachedToken = {
        accessToken: access_token,
        tokenType: response.data.token_type || 'Bearer',
        expiresAt: Date.now() + expires_in * 1000,
        expiresIn: expires_in,
        generatedAt: new Date(),
      };

      this.logger.info({ expiresIn: expires_in }, 'Successfully obtained new access token');

      return access_token;
    } catch (error) {
      this.cachedToken = null;

      if (error instanceof AuthenticationException) {
        throw error;
      }

      const axiosError = error as {
        response?: { status: number; data: unknown };
        message?: string;
      };

      if (axiosError.response) {
        const { status, data } = axiosError.response;

        if (status === 401) {
          this.logger.error({ status, data }, 'Invalid SasaPay credentials');
          throw new InvalidCredentialsException('Invalid SasaPay API credentials');
        }

        this.logger.error({ status, data }, 'Failed to obtain SasaPay access token');
        throw new AuthenticationException(`Failed to authenticate with SasaPay: ${status}`);
      }

      this.logger.error(
        { error: axiosError.message },
        'Network error while authenticating with SasaPay',
      );
      throw new AuthenticationException('Network error while authenticating with SasaPay');
    }
  }

  clearCache(): void {
    this.cachedToken = null;
    this.logger.debug('Cleared token cache');
  }

  isAuthenticated(): boolean {
    return this.isTokenValid();
  }

  async generateToken(): Promise<TokenInfo> {
    this.logger.info('Generating new access token');

    await this.getAccessToken();

    if (!this.cachedToken) {
      this.logger.error('Failed to generate token - no cached token available');
      throw new AuthenticationException('Failed to generate token');
    }

    this.logger.info(
      {
        tokenType: this.cachedToken.tokenType,
        expiresIn: this.cachedToken.expiresIn,
        generatedAt: this.cachedToken.generatedAt,
      },
      'Token generated successfully',
    );

    return {
      accessToken: this.cachedToken.accessToken,
      tokenType: this.cachedToken.tokenType,
      expiresIn: this.cachedToken.expiresIn,
      generatedAt: this.cachedToken.generatedAt,
    };
  }
}

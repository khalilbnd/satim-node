import axios, { AxiosInstance } from 'axios';
import * as https from 'https';
import qs from 'qs';
import { SatimConfig, SatimRawResponse } from './types';
import { SatimNetworkError } from './exceptions';

const PRODUCTION_BASE_URL = 'https://satim.dz/payment/rest';
const SANDBOX_BASE_URL    = 'https://test.satim.dz/payment/rest';

/**
 * Low-level HTTP client that talks to the SATIM REST API.
 *
 * SATIM's API accepts application/x-www-form-urlencoded POST requests
 * and returns JSON responses.
 */
export class SatimHttpClient {
  private readonly http: AxiosInstance;
  private readonly username: string;
  private readonly password: string;
  private readonly terminalId: string;
  private readonly debug: boolean;

  constructor(config: Required<SatimConfig>) {
    this.username   = config.username;
    this.password   = config.password;
    this.terminalId = config.terminalId;
    this.debug      = config.debug;

    const baseURL = config.baseUrl || (config.sandbox ? SANDBOX_BASE_URL : PRODUCTION_BASE_URL);

    const axiosConfig: any = {
      baseURL,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept':        'application/json',
      },
    };

    if (config.verifySsl === false) {
      axiosConfig.httpsAgent = new https.Agent({
        rejectUnauthorized: false,
      });
    }

    this.http = axios.create(axiosConfig);
  }

  /**
   * POST to a SATIM endpoint.
   * Automatically injects credentials and serialises the body.
   */
  async post<T = SatimRawResponse>(
    endpoint: string,
    params: Record<string, unknown>
  ): Promise<T> {
    const payload = {
      userName:   this.username,
      password:   this.password,
      terminalId: this.terminalId,
      ...params,
    };

    try {
      if (this.debug) {
        console.log(`[SATIM] POST ${endpoint}`);
        console.log(`[SATIM] Payload:`, JSON.stringify(payload, null, 2));
      }

      const response = await this.http.post<T>(endpoint, qs.stringify(payload));

      if (this.debug) {
        console.log(`[SATIM] Response:`, JSON.stringify(response.data, null, 2));
      }

      return response.data;
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status  = err.response?.status;
        const message = err.response?.data
          ? JSON.stringify(err.response.data)
          : err.message;
        throw new SatimNetworkError(
          `SATIM HTTP ${status ?? 'unknown'}: ${message}`,
          err
        );
      }
      throw new SatimNetworkError(
        `Unexpected network error: ${(err as Error).message}`,
        err
      );
    }
  }
}

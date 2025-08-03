import { lookup } from 'node:dns/promises';
import { defaultsDeep, get } from '@vegapunk/utilities/common';
import { isErrorLike, Result } from '@vegapunk/utilities/result';
import { sleep, waitUntil } from '@vegapunk/utilities/sleep';
import got from 'got';
import { TimeoutError } from 'got/dist/source/core/utils/timed-out';
import UserAgent from 'user-agents';

import type { CancelableRequest, Got, Options, RequestError, Response } from 'got';

export * from 'got';
export { UserAgent };

/**
 * Readonly array of error codes that may trigger retries in {@link requestDefault}.
 * These codes typically represent network or connection issues.
 */
export const ERROR_CODES: readonly string[] = [
  // Got internal
  'ETIMEDOUT',
  'ECONNRESET',
  'EADDRINUSE',
  'ECONNREFUSED',
  'EPIPE',
  'ENOTFOUND',
  'ENETUNREACH',
  'EAI_AGAIN',

  // Got custom
  'ERR_CANCELED',

  // Other
  'ECONNABORTED',
];

/**
 * Readonly array of HTTP status codes that may trigger retries in {@link requestDefault}.
 * These status codes often indicate temporary server-side issues.
 */
export const ERROR_STATUS_CODES: readonly number[] = [408, 413, 429, 500, 502, 503, 504, 521, 522, 524];

/**
 * The core `got` function instance, pre-bound.
 * This can be used to make HTTP requests directly, similar to the original `got` library.
 * For a more robust wrapper with default behaviors such as automatic retries and timeouts,
 * consider using {@link requestDefault}.
 *
 * @example
 * async function fetchData() {
 *   try {
 *     // Simple GET request
 *     const response = await request('https://api.example.com/items');
 *     console.log(response.body);
 *
 *     // POST request with JSON body
 *     const item = await request.post('https://api.example.com/items', {
 *       json: { name: 'newItem', value: 42 }
 *     }).json();
 *     console.log(item);
 *   } catch (error) {
 *     console.error('Request failed:', error);
 *   }
 * }
 * fetchData();
 *
 * @param {string | URL | Options} urlOrOptions The URL to request or a `got` {@link Options} object.
 * @param {Options=} options Additional `got` {@link Options}, used if the first argument is a URL string or `URL` object.
 * @returns {CancelableRequest<Response>} A {@link CancelableRequest} promise that resolves with the HTTP {@link Response}.
 * @throws {RequestError | TimeoutError | unknown} When the request fails due to network issues, timeouts,
 *   or other errors originating from `got`.
 */
export const request: Got = got.bind(got);

const userAgent = new UserAgent({ deviceCategory: 'desktop' });

/**
 * Makes an HTTP request with default behaviors, including automatic retries for specific
 * error codes and status codes, configurable timeouts, and a default user agent.
 * It wraps the {@link request} function to provide a more resilient request mechanism.
 *
 * @example
 * async function fetchDataWithDefaults() {
 *   try {
 *     // Request with default string response body
 *     const response = await requestDefault('https://api.example.com/data');
 *     console.log(response.body);
 *
 *     // Request with JSON response body and custom options
 *     const jsonData = await requestDefault<{ id: number, name: string }>({
 *       url: 'https://api.example.com/json-data',
 *       method: 'POST',
 *       json: { key: 'value' }
 *     });
 *     console.log(jsonData.body.id);
 *   } catch (error) {
 *     console.error('Request with defaults failed:', error);
 *   }
 * }
 * fetchDataWithDefaults();
 *
 * @template T The expected type of the response body. Defaults to `string`.
 * @template E The expected type of Error. Defaults to unknown.
 * @param {string | DefaultOptions} options The URL to request as a string, or a {@link DefaultOptions} object for more control.
 * @returns {Promise<Result<Response<T>, E>>} A promise that resolves with the HTTP {@link Response} object, where the body is of type `T`.
 */
export async function requestDefault<T = string, E = unknown>(options: string | DefaultOptions): Promise<Result<Response<T>, E>> {
  const _options = defaultsDeep(
    {},
    {
      url: typeof options === 'string' ? options : undefined,
      ...(typeof options === 'object' ? options : {}),
    },
    {
      headers: { 'user-agent': userAgent.toString() },
      retry: 3,
      timeout: {
        initial: 10_000,
        transmission: 30_000,
        total: 60_000,
      },
      http2: true,
    },
  );

  return new Promise((resolve) => {
    return waitUntil(
      async (cancel, retry) => {
        const instance = request({
          ..._options,
          retry: 0,
          timeout: undefined,
          resolveBodyOnly: false,
        } as Options) as CancelableRequest<Response<T>>;

        const start = Date.now();
        const { initial, transmission, total } = _options.timeout;
        const totalTimeoutId = setTimeout(() => instance.cancel(), total);
        let initTimeoutId = setTimeout(() => instance.cancel(), initial);
        const resetTimeout = () => {
          clearTimeout(initTimeoutId);
          initTimeoutId = setTimeout(() => instance.cancel(), transmission);
        };

        await instance
          .on('uploadProgress', () => resetTimeout())
          .on('downloadProgress', () => resetTimeout())
          .then((res) => (cancel(), resolve(Result.ok(res))))
          .catch((error) => {
            if (isErrorLike<RequestError>(error)) {
              const flagOne = ERROR_CODES.includes(error.code);
              const flagTwo = ERROR_STATUS_CODES.includes(get(error, 'response.statusCode', 0));
              if ((flagOne || flagTwo) && (_options.retry < 0 || _options.retry > retry)) return;
            }
            if (instance.isCanceled) {
              error = new TimeoutError(Date.now() - start, 'request');
            }

            // internal got error is hard to trace
            Error.captureStackTrace(error, requestDefault);
            (cancel(), resolve(Result.err(error)));
          })
          .finally(() => {
            clearTimeout(totalTimeoutId);
            clearTimeout(initTimeoutId);
          });
      },
      { delay: 0 },
    );
  });
}

/**
 * Waits for an active internet connection by attempting to reach known reliable endpoints.
 * It concurrently tries DNS lookup for 'google.com' and fetching Apple's captive portal detection URL.
 * The function resolves once either check succeeds. If checks fail, it waits for a specified duration before retrying.
 *
 * @example
 * async function ensureConnected() {
 *   try {
 *     console.log('Checking for internet connection...');
 *     await waitForConnection(5000); // Wait up to 5 seconds for each attempt cycle
 *     console.log('Connection established.');
 *   } catch (error) {
 *     // This function is designed to retry indefinitely and not throw.
 *     // An error here would imply an issue with the waitUntil utility itself or an unhandled case.
 *     console.error('Unexpected error during connection check:', error);
 *   }
 * }
 * ensureConnected();
 *
 * @param {number=} [total=10000] The timeout in milliseconds for individual connection attempts and
 *   the sleep duration between retry cycles if both checks fail.
 * @returns {Promise<void>} A promise that resolves when a connection is established.
 */
export async function waitForConnection(total: number = 10_000): Promise<void> {
  const checkGoogle = async (resolve: () => void): Promise<void> => {
    await lookup('google.com').then(() => resolve());
  };
  const checkApple = async (resolve: () => void): Promise<void> => {
    await requestDefault({
      url: 'https://captive.apple.com/hotspot-detect.html',
      headers: { 'user-agent': 'CaptiveNetworkSupport/1.0 wispr' },
      timeout: { total },
      retry: 0,
    }).then((r) => r.inspect(() => resolve()));
  };

  return waitUntil(async (resolve) => {
    try {
      await Promise.race([checkGoogle(resolve), checkApple(resolve)]);
    } catch {
      await sleep(total);
    }
  });
}

type ExcludeOptions = 'prefixUrl' | 'retry' | 'timeout' | 'resolveBodyOnly';

/**
 * Configuration options for {@link requestDefault}.
 * This interface extends `got`'s {@link Options} but omits certain fields (`prefixUrl`, `retry`, `timeout`, `resolveBodyOnly`)
 * that are managed internally by {@link requestDefault} or have specific handling within it.
 */
export interface DefaultOptions extends Omit<Options, ExcludeOptions> {
  /**
   * Number of retry attempts for the request.
   * This controls how many times {@link requestDefault} will retry on specific errors (listed in {@link ERROR_CODES})
   * or HTTP status codes (listed in {@link ERROR_STATUS_CODES}).
   * A negative value means retry indefinitely.
   */
  retry?: number;
  /**
   * Timeout settings for the request, managed by {@link requestDefault}.
   * These provide granular control over different phases of the request lifecycle.
   */
  timeout?: Partial<{
    /**
     * Milliseconds to wait for the initial server connection to be established
     * before the request is considered timed out. This timeout applies from the start of the request
     * until the first byte of the response headers is received or the request body starts sending.
     */
    initial: number;
    /**
     * Milliseconds to wait for data to be transmitted (either sending the request body
     * or receiving the response body) after the initial connection has been made.
     * This timeout resets upon any data activity (e.g., 'uploadProgress', 'downloadProgress').
     * If no data is sent or received within this period, the request is cancelled.
     */
    transmission: number;
    /**
     * Total milliseconds for the entire request lifecycle, from the moment the request is initiated
     * until the response body is fully downloaded. This acts as an overall deadline for the request.
     */
    total: number;
  }>;
}

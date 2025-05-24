import { defaultsDeep } from '@vegapunk/utilities'
import { get } from '@vegapunk/utilities/common'
import { isErrorLike } from '@vegapunk/utilities/result'
import { sleep, waitUntil } from '@vegapunk/utilities/sleep'
import got, { type CancelableRequest, type Got, type Options, type RequestError, type Response } from 'got'
import { TimeoutError } from 'got/dist/source/core/utils/timed-out'
import { lookup } from 'node:dns/promises'
import UserAgent from 'user-agents'

export * from 'got'
export { UserAgent }

/**
 * Readonly array of error codes that may trigger retries in `requestDefault`.
 * These codes typically represent network or connection issues.
 */
export const ErrorCodes: readonly string[] = [
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
]

/**
 * Readonly array of HTTP status codes that may trigger retries in `requestDefault`.
 * These status codes often indicate temporary server-side issues.
 */
export const ErrorStatusCodes: readonly number[] = [408, 413, 429, 500, 502, 503, 504, 521, 522, 524]

/**
 * The core `got` function instance, pre-bound.
 * This can be used to make HTTP requests directly, similar to the original `got` library.
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
 * @param {string | URL | Options} urlOrOptions The URL to request or a `got` options object.
 * @param {Options=} options Additional `got` options, used if the first argument is a URL string or `URL` object.
 * @returns {CancelableRequest<Response>} A `CancelableRequest` promise that resolves with the HTTP response.
 * @throws {RequestError | TimeoutError | unknown} When the request fails due to network issues, timeouts, or other errors.
 */
export const request: Got = got.bind(got)

const userAgent = new UserAgent({ deviceCategory: 'desktop' })

/**
 * Makes an HTTP request with enhanced default settings, including a standard user-agent,
 * retry logic for specific errors and status codes, and a multi-stage timeout handling.
 *
 * @example
 * // Request a URL as a string, expecting a string response
 * requestDefault('https://example.com')
 *   .then(response => console.log(response.body))
 *   .catch(error => console.error('Failed to fetch:', error));
 *
 * // Request with custom options, expecting a JSON response
 * interface MyData {
 *   id: number;
 *   name: string;
 * }
 * requestDefault<MyData>({
 *   url: 'https://api.example.com/data',
 *   method: 'POST',
 *   json: { key: 'value' }
 * })
 * .then(response => console.log(response.body.id))
 * .catch(error => console.error('API call failed:', error));
 *
 * @template T The expected type of the response body.
 * @param {string | DefaultOptions} options The URL to request as a string, or a `DefaultOptions` object.
 * @returns {Promise<Response<T>>} A promise that resolves with the HTTP response object.
 * @throws {TimeoutError | RequestError | unknown} When the request times out after all retry attempts,
 * or if another unrecoverable `got` internal error or network error occurs.
 */
export async function requestDefault<T = string>(options: string | DefaultOptions): Promise<Response<T>> {
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
  )

  return new Promise((resolve, reject) => {
    return waitUntil(
      async (cancel, retry) => {
        const instance = request({
          ..._options,
          retry: 0,
          timeout: undefined,
          resolveBodyOnly: false,
        } as Options) as CancelableRequest<Response<T>>

        const start = Date.now()
        const { initial, transmission, total } = _options.timeout
        const totalTimeout = setTimeout(() => instance.cancel(), total).unref()
        let initialTimeout = setTimeout(() => instance.cancel(), initial).unref()
        const resetTimeout = () => {
          clearTimeout(initialTimeout)
          initialTimeout = setTimeout(() => instance.cancel(), transmission).unref()
        }

        await instance
          .on('uploadProgress', () => resetTimeout())
          .on('downloadProgress', () => resetTimeout())
          .then((res) => (cancel(), resolve(res)))
          .catch((error) => {
            if (isErrorLike<RequestError>(error)) {
              const flagOne = ErrorCodes.includes(error.code)
              const flagTwo = ErrorStatusCodes.includes(get(error, 'response.statusCode', 0))
              if ((flagOne || flagTwo) && (_options.retry < 0 || _options.retry > retry)) return
            }
            if (instance.isCanceled) {
              error = new TimeoutError(Date.now() - start, 'request')
            }

            // internal got error is hard to trace
            Error.captureStackTrace(error, requestDefault)
            cancel(), reject(error)
          })
          .finally(() => {
            clearTimeout(totalTimeout)
            clearTimeout(initialTimeout)
          })
      },
      { delay: 0 },
    )
  })
}

/**
 * Waits for an active internet connection to be established.
 * It periodically checks connectivity by attempting to resolve 'google.com' via DNS
 * and by requesting 'captive.apple.com'.
 *
 * @example
 * async function ensureConnected() {
 *   console.log('Checking for internet connection...');
 *   try {
 *     await waitForConnection(5000); // Check with a 5-second interval/timeout for individual checks
 *     console.log('Internet connection established.');
 *     // Proceed with network-dependent tasks
 *   } catch (error) {
 *     // This catch block would typically be hit if `waitUntil` itself has a mechanism to give up and reject.
 *     console.error('Failed to establish internet connection after multiple attempts:', error);
 *   }
 * }
 * ensureConnected();
 *
 * @param {number=} [total=10000] The timeout in milliseconds for each individual check (DNS lookup or HTTP request to Apple).
 * Also used as the sleep duration between failed attempts.
 * @returns {Promise<void>} A promise that resolves when an internet connection is detected.
 * @throws {unknown} If the `waitUntil` utility itself gives up due to internal limits (e.g., max retries or total timeout),
 * though this specific implementation of `waitForConnection` primarily retries on failure.
 */
export async function waitForConnection(total: number = 10_000): Promise<void> {
  const checkGoogle = (resolve: () => void) => {
    return lookup('google.com').then(resolve)
  }
  const checkApple = (resolve: () => void) => {
    return requestDefault({
      url: 'https://captive.apple.com/hotspot-detect.html',
      headers: { 'user-agent': 'CaptiveNetworkSupport/1.0 wispr' },
      timeout: { total },
      retry: 0,
    }).then(resolve)
  }

  return waitUntil(async (resolve) => {
    try {
      await Promise.race([checkGoogle(resolve), checkApple(resolve)])
    } catch {
      await sleep(total)
    }
  })
}

type ExcludeOptions = 'prefixUrl' | 'retry' | 'timeout' | 'resolveBodyOnly'

/**
 * Defines the structure for options passable to the `requestDefault` function.
 * It omits certain properties from the standard `got.Options` type and provides
 * specific partial types for `retry` and `timeout` configurations.
 */
export interface DefaultOptions extends Omit<Options, ExcludeOptions> {
  /**
   * Number of retry attempts.
   * If less than 0, retries indefinitely for eligible errors.
   */
  retry?: number
  /**
   * Timeout settings for the request, allowing specification of initial connection,
   * data transmission, and total request duration timeouts.
   */
  timeout?: Partial<{
    /** Timeout for the initial connection phase in milliseconds. */
    initial: number
    /** Timeout for data transmission phase in milliseconds, reset on progress. */
    transmission: number
    /** Overall total timeout for the entire request in milliseconds. */
    total: number
  }>
}

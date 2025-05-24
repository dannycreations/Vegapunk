import { defaultsDeep } from '@vegapunk/utilities'
import { get } from '@vegapunk/utilities/common'
import { isErrorLike } from '@vegapunk/utilities/result'
import { sleep, sleepUntil } from '@vegapunk/utilities/sleep'
import got, { type CancelableRequest, type Got, type Options, type RequestError, type Response } from 'got'
import { TimeoutError } from 'got/dist/source/core/utils/timed-out'
import { lookup } from 'node:dns/promises'
import UserAgent from 'user-agents'

export * from 'got'
export { UserAgent }

/**
 * Read-only array of error codes that may trigger a retry in the `requestDefault`
 * function's custom retry logic. These codes typically represent transient
 * network or connection issues.
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
 * Read-only array of HTTP status codes that may trigger a retry in the
 * `requestDefault` function's custom retry logic. These codes usually
 * indicate server-side issues or rate limiting that might be resolved on a subsequent attempt.
 */
export const ErrorStatusCodes: readonly number[] = [408, 413, 429, 500, 502, 503, 504, 521, 522, 524]

/**
 * A `got` instance for making HTTP/HTTPS requests, bound from the imported `got` library.
 * It supports the standard `got` API for sending requests.
 * For requests with enhanced default behaviors (e.g., custom user-agent, specific retry logic, and layered timeouts),
 * consider using the `requestDefault` function.
 *
 * @example
 * async function main() {
 *   try {
 *     // Requesting a URL (string)
 *     const response = await request('https://jsonplaceholder.typicode.com/todos/1');
 *     console.log(JSON.parse(response.body));
 *
 *     // Requesting with an options object
 *     const { body } = await request({
 *       url: 'https://jsonplaceholder.typicode.com/posts',
 *       method: 'POST',
 *       json: { title: 'foo', body: 'bar', userId: 1 },
 *       responseType: 'json'
 *     });
 *     console.log(body); // The 'body' is already parsed as JSON
 *   } catch (error) {
 *     // Type guard for RequestError if needed, though error.message is usually available
 *     if (error instanceof request.RequestError) {
 *       console.error('Request failed specifically:', error.message, error.code);
 *     } else {
 *       console.error('An unexpected error occurred:', error.message);
 *     }
 *   }
 * }
 * main();
 *
 * @param {string | URL | import('got').Options} urlOrOptions - If a string or URL, it's the request URL.
 *   If an object, it's the `got.Options` configuration for the request.
 *   Refer to the official `got` documentation for details on all available options.
 * @param {import('got').Options=} [options] - If `urlOrOptions` is a string or URL, this parameter can be
 *   used to provide `got.Options`. This parameter is ignored if `urlOrOptions` is an object.
 *   Refer to the official `got` documentation.
 * @returns {import('got').CancelableRequest} A `CancelableRequest` (a Promise with a `.cancel()` method).
 *   It resolves to a `Response` object from `got`. The `body` type of the response depends on options like
 *   `responseType` or content-type headers (e.g., string by default, object if `responseType: 'json'` is used).
 *   See `got` documentation for specifics.
 * @throws {import('got').RequestError} Throws `RequestError` or its subtypes (e.g., `HTTPError`, `MaxRedirectsError`, `TimeoutError`)
 *   on various request failures like network issues, timeouts, or non-successful HTTP status codes (if `throwHttpErrors` is enabled by default or explicitly set).
 *   Consult `got` documentation for error handling details.
 */
export const request: Got = got.bind(got)

const userAgent = new UserAgent({ deviceCategory: 'desktop' })

/**
 * Makes an HTTP/HTTPS request with sensible defaults and a custom layered timeout and retry mechanism.
 * It uses a default desktop User-Agent header. Retries are attempted for specific error codes
 * and status codes. Timeouts are managed at three levels: initial connection, data transmission, and total request duration.
 *
 * @example
 * // Simple GET request
 * requestDefault('https://api.example.com/data')
 *   .then(response => console.log(response.body))
 *   .catch(error => console.error('Request failed:', error.message));
 *
 * // POST request with custom options
 * async function postData() {
 *   try {
 *     const response = await requestDefault<MyExpectedType>({
 *       url: 'https://api.example.com/submit',
 *       method: 'POST',
 *       json: { key: 'value' },
 *       retry: 2, // Override default retry count
 *       timeout: { total: 45000 } // Override total timeout
 *     });
 *     console.log('Submission successful. Status:', response.statusCode);
 *     // response.body will be of MyExpectedType if request is successful and server returns compatible JSON
 *   } catch (error) {
 *     console.error('Submission failed:', error.message);
 *   }
 * }
 * postData();
 *
 * @template T The expected type of the response body. Defaults to `string`.
 * @param {string | DefaultOptions} options The URL to request (as a string) or a `DefaultOptions` object.
 *   The `DefaultOptions` object allows customization of standard `got` options, with specific
 *   behavior for `retry` and `timeout`.
 *   - `retry`: Number of retry attempts. Defaults to 3.
 *   - `timeout`: An object specifying timeouts in milliseconds:
 *     - `initial`: For connection and initial response. Defaults to 10,000ms.
 *     - `transmission`: For ongoing data transfer, reset on progress. Defaults to 30,000ms.
 *     - `total`: Overall request duration. Defaults to 60,000ms.
 *   Other `got.Options` can be passed, excluding `prefixUrl`, `resolveBodyOnly`, and `got`'s own `retry` and `timeout` objects
 *   which are handled by this function's custom logic.
 * @returns {Promise<Response<T>>} A promise that resolves with the `got.Response` object, where the body is of type `T`.
 * @throws {TimeoutError | import('got').RequestError} Throws `TimeoutError` if the request exceeds any of the configured
 *   custom timeout thresholds (initial, transmission, or total). Throws `RequestError` (or its subtypes)
 *   for other unrecoverable network or HTTP errors not handled by the retry mechanism.
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
    return sleepUntil(
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
 * Waits until an internet connection is established.
 * It periodically checks connectivity by attempting to resolve 'google.com' via DNS
 * and by requesting Apple's captive portal detection URL.
 * The function resolves once either check succeeds. It retries indefinitely upon failure.
 *
 * @example
 * async function initializeApp() {
 *   console.log('Checking for internet connection...');
 *   await waitForConnection();
 *   console.log('Internet connection established. Proceeding with app initialization.');
 *   // ... rest of initialization logic
 * }
 * initializeApp();
 *
 * @example
 * // Using a custom timeout for Apple's captive portal check attempts
 * async function checkWithCustomTimeout() {
 *   console.log('Waiting for connection with 5s check timeout...');
 *   await waitForConnection(5000);
 *   console.log('Connection available.');
 * }
 * checkWithCustomTimeout();
 *
 * @param {number=} [total=10000] The timeout in milliseconds for the individual HTTP request
 *   attempt to Apple's captive portal detection URL. This also serves as the sleep duration
 *   between sets of checks if both fail.
 * @returns {Promise<void>} A promise that resolves when an internet connection is detected.
 *   This promise does not reject under normal operation as it retries indefinitely.
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

  return sleepUntil(async (resolve) => {
    try {
      await Promise.race([checkGoogle(resolve), checkApple(resolve)])
    } catch {
      await sleep(total)
    }
  })
}

type ExcludeOptions = 'prefixUrl' | 'retry' | 'timeout' | 'resolveBodyOnly'

export interface DefaultOptions extends Omit<Options, ExcludeOptions> {
  retry?: number
  timeout?: Partial<{
    initial: number
    transmission: number
    total: number
  }>
}

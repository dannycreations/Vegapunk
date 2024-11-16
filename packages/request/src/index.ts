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
export const ErrorStatusCodes: readonly number[] = [408, 413, 429, 500, 502, 503, 504, 521, 522, 524]

export const request: Got = got.bind(got)

const userAgent = new UserAgent({ deviceCategory: 'desktop' })
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
 * Waits for a network connection by attempting to reach external services (Google DNS and Apple's captive portal).
 *
 * This function checks for network connectivity by performing two parallel checks:
 * - A DNS lookup for `google.com`.
 * - An HTTP request to Apple's captive portal detection endpoint.
 *
 * If neither check succeeds, the function will retry until the specified timeout expires.
 *
 * @param {number} [total=10000] - The total timeout in milliseconds for checking network connectivity.
 * @returns {Promise<void>} Resolves when a network connection is detected.
 *
 * @example
 * // Wait for network connectivity (default timeout is 10 seconds)
 * await waitForConnection();
 *
 * // Wait for connectivity with a custom timeout
 * await waitForConnection(15000);
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

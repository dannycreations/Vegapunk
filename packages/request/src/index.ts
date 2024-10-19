import { defaultsDeep, sleep, sleepUntil } from '@vegapunk/utilities'
import got, { type CancelableRequest, type Options, type Response } from 'got'
import { TimeoutError } from 'got/dist/source/core/utils/timed-out'
import { lookup } from 'node:dns/promises'
import UserAgent from 'user-agents'

export * from 'got'
export { UserAgent }

export const ErrorCodes = [
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
export const ErrorStatusCodes = [408, 413, 429, 500, 502, 503, 504, 521, 522, 524]

export const request = got.bind(got)

const userAgent = new UserAgent({ deviceCategory: 'desktop' })
export async function requestDefault<T = string>(options: string | DefaultOptions) {
	const _options = defaultsDeep<DefaultOptions>(
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

	return new Promise<Response<T>>((resolve, reject) => {
		return sleepUntil(
			async (cancel, retry) => {
				const instance = request({
					..._options,
					retry: 0,
					timeout: undefined,
					resolveBodyOnly: false,
				}) as CancelableRequest<Response<T>>

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
						const flagOne = !!~ErrorCodes.indexOf(error.code)
						const flagTwo = typeof error.response === 'object' && !!~ErrorStatusCodes.indexOf(error.response.statusCode)
						if ((flagOne || flagTwo) && (_options.retry < 0 || _options.retry > retry)) return
						else if (instance.isCanceled) {
							error = new TimeoutError(Date.now() - start, 'request')
							Error.captureStackTrace(error, requestDefault)
						}
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

export async function waitForConnection(timeout = 10_000) {
	const checkGoogle = (resolve: () => void) => {
		return lookup('google.com').then(resolve)
	}
	const checkApple = (resolve: () => void) => {
		return requestDefault({
			url: 'https://captive.apple.com/hotspot-detect.html',
			headers: { 'user-agent': 'CaptiveNetworkSupport/1.0 wispr' },
			timeout: { total: timeout },
		}).then(resolve)
	}

	await sleepUntil(async (resolve) => {
		try {
			await Promise.race([checkGoogle(resolve), checkApple(resolve)])
		} catch {
			await sleep(timeout)
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

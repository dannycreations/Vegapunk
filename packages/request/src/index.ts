import { defaultsDeep, sleep, sleepUntil } from '@vegapunk/utilities'
import got, { type CancelableRequest, CancelError, type Options, type Response } from 'got'
import { TimeoutError } from 'got/dist/source/core/utils/timed-out'
import { lookup } from 'node:dns/promises'
import UserAgent from 'user-agents'

export const ErrorCodes = [
	'ETIMEDOUT',
	'ECONNRESET',
	'EADDRINUSE',
	'ECONNREFUSED',
	'EPIPE',
	'ENOTFOUND',
	'ENETUNREACH',
	'EAI_AGAIN',
	'ECONNABORTED',
	'ERR_CANCELED',
]
export const ErrorStatusCodes = [408, 413, 429, 500, 502, 503, 504, 521, 522, 524]

export * from 'got'
export { UserAgent }

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
			timeout: {
				initial: 10_000,
				transmission: 30_000,
				total: 60_000,
			},
			http2: true,
		},
	)

	const instance = request({
		..._options,
		retry:
			_options.retry === -1
				? 0
				: {
						limit: _options.retry ?? 3,
						statusCodes: ErrorStatusCodes,
						errorCodes: ErrorCodes,
				  },
		timeout: undefined,
		resolveBodyOnly: undefined,
	} as Options) as CancelableRequest<Response<T>>

	const cancel = () => instance.cancel()
	const totalTimeout = setTimeout(() => cancel(), _options.timeout.total).unref()
	let initialTimeout = setTimeout(() => cancel(), _options.timeout.initial).unref()

	instance
		.on('uploadProgress', () => {
			clearTimeout(initialTimeout)
			initialTimeout = setTimeout(() => cancel(), _options.timeout.transmission).unref()
		})
		.on('downloadProgress', () => {
			clearTimeout(initialTimeout)
			initialTimeout = setTimeout(() => cancel(), _options.timeout.transmission).unref()
		})

	try {
		return await instance
	} catch (error) {
		const flagOne = ErrorCodes.includes(error.code)
		const flagTwo = typeof error.response === 'object' && ErrorStatusCodes.includes(error.response.statusCode)
		if (_options.retry === -1 && (flagOne || flagTwo)) return requestDefault(options)
		if (error instanceof CancelError) {
			error = new TimeoutError(0, 'request')
			error.message = 'Request timeout'
		}
		throw error
	} finally {
		clearTimeout(totalTimeout)
		clearTimeout(initialTimeout)
	}
}

export async function waitForConnection(timeout: 10_000) {
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

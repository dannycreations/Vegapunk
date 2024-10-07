import { _, DeepRequired, sleep, sleepUntil } from '@vegapunk/utilities'
import got, { type CancelableRequest, CancelError, type Options, type Response } from 'got'
import { TimeoutError } from 'got/dist/source/core/utils/timed-out'
import { lookup } from 'node:dns/promises'
import _UserAgent from 'user-agents'

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
export const UserAgent = _UserAgent

export async function request<T = string>(options: string | Options) {
	const _options: Options = {
		url: typeof options === 'string' ? options : undefined,
		...(typeof options === 'object' ? options : {}),
	}
	return got(_options) as Promise<Response<T>>
}

const userAgent = new UserAgent({ deviceCategory: 'desktop' })
export async function requestDefault<T = string>(options: string | DefaultOptions) {
	const _options: DeepRequired<DefaultOptions> = _.defaultsDeep(
		{},
		{
			url: typeof options === 'string' ? options : undefined,
			...(typeof options === 'object' ? options : {}),
			headers: typeof options === 'object' && typeof options.headers === 'object' ? options.headers : {},
		},
		{
			headers: { 'user-agent': userAgent.toString() },
			http2: true,
			timeout: {
				initial: 10_000,
				transmission: 30_000,
				total: 60_000,
			},
		},
	)

	const instance = got({
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
	}) as CancelableRequest<Response<T>>

	const cancel = () => instance.cancel()
	const _totalTimeout = setTimeout(cancel, _options.timeout.total).unref()
	let _initialTimeout = setTimeout(cancel, _options.timeout.initial).unref()

	instance
		.on('uploadProgress', () => {
			clearTimeout(_initialTimeout)
			_initialTimeout = setTimeout(cancel, _options.timeout.transmission).unref()
		})
		.on('downloadProgress', () => {
			clearTimeout(_initialTimeout)
			_initialTimeout = setTimeout(cancel, _options.timeout.transmission).unref()
		})

	try {
		return await instance
	} catch (error) {
		const flagOne = ErrorCodes.includes(error.code)
		const flagTwo = typeof error.response === 'object' && ErrorStatusCodes.includes(error.response.statusCode)
		if (_options.retry === -1 && (flagOne || flagTwo)) return requestDefault(options)
		if (error instanceof CancelError) {
			const timeout = new TimeoutError(0, 'request')
			timeout.message = 'Request timeout'
			throw timeout
		}
		throw error
	} finally {
		clearTimeout(_totalTimeout)
		clearTimeout(_initialTimeout)
	}
}

export async function waitForConnection(options: Pick<DefaultOptions, 'timeout'> = {}) {
	const _options: DeepRequired<DefaultOptions> = _.defaultsDeep({}, options, {
		timeout: { total: 10_000 },
	})

	const checkGoogle = async (resolve: () => void) => {
		return lookup('google.com').then(resolve)
	}
	const checkApple = async (resolve: () => void) => {
		return requestDefault({
			url: 'https://captive.apple.com/hotspot-detect.html',
			headers: { 'user-agent': 'CaptiveNetworkSupport/1.0 wispr' },
			resolveBodyOnly: true,
			timeout: _options.timeout,
		}).then(resolve)
	}

	await sleepUntil(async (resolve) => {
		try {
			await Promise.race([checkGoogle(resolve), checkApple(resolve)])
		} catch {
			await sleep(_options.timeout.total)
		}
	})
}

export interface DefaultOptions extends Omit<Options, 'prefixUrl' | 'retry' | 'timeout'> {
	retry?: number
	timeout?: Partial<{
		initial: number
		transmission: number
		total: number
	}>
}

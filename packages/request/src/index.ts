import { sleep, sleepUntil } from '@vegapunk/utilities'
import got, { type CancelableRequest, CancelError, type Options, type Response } from 'got'
import { TimeoutError } from 'got/dist/source/core/utils/timed-out'
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
	const _options: Options = {}
	if (typeof options === 'string') {
		_options.url = options
	} else if (typeof options === 'object') {
		Object.assign(_options, options)
	}
	return got(_options) as Promise<Response<T>>
}

const userAgent = new UserAgent({ deviceCategory: 'desktop' })
export async function requestDefault<T = string>(options: string | DefaultOptions) {
	const _options: DefaultOptions = {}
	if (typeof options === 'string') {
		_options.url = options
	} else if (typeof options === 'object') {
		Object.assign(_options, options)
	}

	_options.headers = {
		'user-agent': userAgent.toString(),
		..._options.headers,
	}
	_options.timeout = {
		initial: 10_000,
		transmission: 30_000,
		total: 60_000,
		..._options.timeout,
	}

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
	const _totalTimeout = setTimeout(cancel, _options.timeout.total)
	let _initialTimeout = setTimeout(cancel, _options.timeout.initial)

	instance
		.on('uploadProgress', () => {
			clearTimeout(_initialTimeout)
			_initialTimeout = setTimeout(cancel, _options.timeout.transmission)
		})
		.on('downloadProgress', () => {
			clearTimeout(_initialTimeout)
			_initialTimeout = setTimeout(cancel, _options.timeout.transmission)
		})

	try {
		return await instance
	} catch (error) {
		if (_options.retry === -1 && (ErrorCodes.includes(error.code) || ('response' in error && ErrorStatusCodes.includes(error.response.statusCode)))) {
			return requestDefault(options)
		}

		if (error instanceof CancelError) {
			const timeout = new TimeoutError(null, 'request')
			timeout.message = 'Request timeout'
			throw timeout
		}

		throw error
	} finally {
		clearTimeout(_totalTimeout)
		clearTimeout(_initialTimeout)
	}
}

export async function waitForConnection(options: DefaultOptions = {}) {
	options.timeout = {
		total: 10_000,
		...options.timeout,
	}

	let statusCode = 0
	await sleepUntil(async () => {
		try {
			const res = await requestDefault({
				method: 'HEAD',
				url: 'https://google.com',
				...options,
			})
			statusCode = res.statusCode
		} catch {
			await sleep(options.timeout.total)
		} finally {
			return statusCode === 200
		}
	})
}

export interface DefaultOptions extends Omit<Options, 'retry' | 'timeout'> {
	retry?: number
	timeout?: Partial<{
		initial: number
		transmission: number
		total: number
	}>
}

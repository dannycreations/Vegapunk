import got, { CancelableRequest, CancelError, Options, Response } from 'got'
import { TimeoutError } from 'got/dist/source/core/utils/timed-out'
import { setTimeout as sleep } from 'node:timers/promises'
import _UserAgent from 'user-agents'

export const ERROR_CODES = [
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
export const ERROR_STATUS_CODES = [408, 413, 429, 500, 502, 503, 504, 521, 522, 524]

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
						statusCodes: ERROR_STATUS_CODES,
						errorCodes: ERROR_CODES,
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
		if (
			_options.retry === -1 &&
			(ERROR_CODES.includes(error.code) || ('response' in error && ERROR_STATUS_CODES.includes(error.response.statusCode)))
		) {
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

export function waitForConnection(options: DefaultOptions = {}) {
	return new Promise<boolean>((resolve) => {
		options.timeout = {
			total: 10_000,
			...options.timeout,
		}

		const wait = async () => {
			try {
				const res = await requestDefault({
					method: 'HEAD',
					url: 'https://google.com',
					...options,
				})
				if (res.statusCode === 200) {
					return resolve(true)
				}
			} catch {
				await sleep(options.timeout.total)
			}

			return wait()
		}

		return wait()
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

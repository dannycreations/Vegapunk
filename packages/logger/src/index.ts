import { tz } from 'moment-timezone'
import _pino, { Level, StreamEntry } from 'pino'
import _PinoPretty from 'pino-pretty'

export * from 'pino'
export const PinoPretty = _PinoPretty

export function logger<T extends string>(options: LoggerOptions = {}) {
	options = {
		level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
		exceptionHandler: true,
		rejectionHandler: true,
		...options,
	}

	const streams: StreamEntry[] = [
		{
			level: 'warn',
			stream: _pino.destination({
				mkdir: true,
				dest: `${process.cwd()}/logs/errors.log`,
			}),
		},
		{
			level: options.level,
			stream: _PinoPretty({
				sync: true,
				colorize: true,
				singleLine: process.env.NODE_ENV === 'production',
				customPrettifiers: {
					time: () => `[${getTimezoneDate().format('HH:mm:ss')}]`,
				},
			}),
		},
	]

	const pino = _pino<T>(
		{
			level: options.level,
			base: undefined,
			nestedKey: 'payload',
		},
		_pino.multistream(streams),
	)

	if (options.exceptionHandler) {
		process.on('uncaughtException', (err, origin) => pino.fatal(err, origin))
	}
	if (options.rejectionHandler) {
		process.on('unhandledRejection', (reason: string, promise) => pino.fatal(promise, reason))
	}
	return pino
}

export function getTimezoneDate(date: Date = new Date(), timezone?: string) {
	return tz(date, timezone || process.env.TIMEZONE || Intl.DateTimeFormat().resolvedOptions().timeZone)
}

export interface LoggerOptions {
	level?: Level
	exceptionHandler?: boolean
	rejectionHandler?: boolean
}

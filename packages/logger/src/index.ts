import _pino, { type Level, type StreamEntry } from 'pino'
import _pinoPretty from 'pino-pretty'

export * from 'pino'
export const pinoPretty = _pinoPretty

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
			stream: pinoPretty({
				colorize: true,
				translateTime: 'SYS:HH:MM:ss',
				sync: process.env.NODE_ENV === 'development',
				singleLine: process.env.NODE_ENV === 'production',
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
		process.on('uncaughtException', (err, origin) => pino.fatal(err, `Logger: UncaughtException ${origin}`))
	}
	if (options.rejectionHandler) {
		process.on('unhandledRejection', (reason: string, promise) => pino.fatal(promise, `Logger: UnhandledRejection ${reason}`))
	}
	return pino
}

export interface LoggerOptions {
	level?: Level
	exceptionHandler?: boolean
	rejectionHandler?: boolean
}

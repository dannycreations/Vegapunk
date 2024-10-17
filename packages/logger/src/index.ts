import _pino, { type Level, type StreamEntry } from 'pino'
import _pinoPretty from 'pino-pretty'

export * from 'pino'
export const pinoPretty = _pinoPretty

export function logger<T extends string>(options: LoggerOptions = {}) {
	options = {
		level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
		exception: true,
		rejection: true,
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

	if (options.exception) {
		process.on('uncaughtException', (error, _origin) => {
			pino.fatal(error, 'UncaughtException')
		})
	}
	if (options.rejection) {
		process.on('unhandledRejection', (reason: string, stack) => {
			const error = Object.assign(new Error(reason), { stack })
			pino.fatal(error, 'UnhandledRejection')
		})
	}
	return pino
}

export interface LoggerOptions {
	level?: Level
	exception?: boolean
	rejection?: boolean
}

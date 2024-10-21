import pino, { type Level, type Logger, type StreamEntry } from 'pino'
import pinoPretty from 'pino-pretty'

export * from 'pino'
export { pinoPretty }

export function logger(options: LoggerOptions = {}): Logger {
	options = {
		level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
		exception: true,
		rejection: true,
		...options,
	}

	const streams: StreamEntry[] = [
		{
			level: 'warn',
			stream: pino.destination({
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

	const logger = pino(
		{
			level: options.level,
			base: undefined,
			nestedKey: 'payload',
		},
		pino.multistream(streams),
	)

	if (options.exception) {
		process.on('uncaughtException', (error, _origin) => {
			logger.fatal(error, 'UncaughtException')
		})
	}
	if (options.rejection) {
		process.on('unhandledRejection', (reason: string, stack) => {
			const error = Object.assign(new Error(reason), { stack })
			logger.fatal(error, 'UnhandledRejection')
		})
	}
	return logger
}

export interface LoggerOptions {
	level?: Level
	exception?: boolean
	rejection?: boolean
}

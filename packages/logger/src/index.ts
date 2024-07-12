import { tz } from 'moment-timezone'
import _pino, { Level, StreamEntry } from 'pino'
import _PinoPretty from 'pino-pretty'

export * from 'pino'
export const PinoPretty = _PinoPretty

export function logger<T extends string>(level?: Level) {
	level ||= process.env.NODE_ENV === 'development' ? 'debug' : 'info'
	const streams: StreamEntry[] = [
		{
			level: 'warn',
			stream: _pino.destination({
				mkdir: true,
				dest: `${process.cwd()}/logs/errors.log`,
			}),
		},
		{
			level,
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

	return _pino<T>(
		{
			level,
			base: undefined,
			nestedKey: 'payload',
		},
		_pino.multistream(streams),
	)
}

export function getTimezoneDate(date: Date = new Date(), timezone?: string) {
	return tz(date, timezone || process.env.TIMEZONE || Intl.DateTimeFormat().resolvedOptions().timeZone)
}

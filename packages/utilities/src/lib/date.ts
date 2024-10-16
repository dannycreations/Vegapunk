import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import humanizeDuration from 'humanize-duration'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(relativeTime)

export { dayjs, humanizeDuration }

declare module 'dayjs' {
	interface Dayjs {
		tz(timezone?: string, keepLocalTime?: boolean): dayjs.Dayjs
		offsetName(type?: 'short' | 'long'): string | undefined

		utc(keepLocalTime?: boolean): dayjs.Dayjs
		local(): dayjs.Dayjs
		isUTC(): boolean
		utcOffset(offset: number | string, keepLocalTime?: boolean): dayjs.Dayjs

		fromNow(withoutSuffix?: boolean): string
		from(compared: dayjs.ConfigType, withoutSuffix?: boolean): string
		toNow(withoutSuffix?: boolean): string
		to(compared: dayjs.ConfigType, withoutSuffix?: boolean): string
	}

	interface DayjsTimezone {
		(date?: dayjs.ConfigType, timezone?: string): dayjs.Dayjs
		(date: dayjs.ConfigType, format: string, timezone?: string): dayjs.Dayjs
		guess(): string
		setDefault(timezone?: string): void
	}

	// @ts-expect-error
	const tz: DayjsTimezone
	function utc(config?: dayjs.ConfigType, format?: string, strict?: boolean): dayjs.Dayjs
}

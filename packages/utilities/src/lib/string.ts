export function truncate(str: string, options: TruncateOptions = {}) {
	const { length = 30, omission = '...', separator } = options
	if (!length) return omission
	if (length >= str.length) return str

	const maxLength = length - omission.length
	if (maxLength <= 0) return omission.slice(0, length)

	let truncated = str.slice(0, maxLength)
	if (separator) {
		const lastSeparatorIndex = truncated.lastIndexOf(separator)
		if (!!~lastSeparatorIndex) truncated = truncated.slice(0, lastSeparatorIndex)
	}
	return truncated + omission
}

export interface TruncateOptions {
	length?: number
	omission?: string
	separator?: string
}

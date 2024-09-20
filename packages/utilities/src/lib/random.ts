import { Snowflake } from '@sapphire/snowflake'
import { customAlphabet } from 'nanoid'

export const VegapunkSnowflake = new Snowflake(1668384000000n)

export function randomString(length: number = 30, str?: string) {
	const asciiDigits = '0123456789'
	const asciiLowers = 'abcdefghijklmnopqrstuvwxyz'
	const asciiUppers = asciiLowers.toUpperCase()
	str ||= `${asciiLowers}${asciiUppers}${asciiDigits}`
	return customAlphabet(str, length)()
}

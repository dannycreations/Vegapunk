import { Snowflake } from '@sapphire/snowflake'
import { customAlphabet } from 'nanoid'

export const VegapunkSnowflake = new Snowflake(1668384000000n)

export enum Alphabet {
	L = 'abcdefghijklmnopqrstuvwxyz',
	U = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
	N = '0123456789',
	S = '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~',
}

export function randomString(length: number = 30, ...str: Alphabet[]) {
	str = str.length ? str : [Alphabet.L, Alphabet.U, Alphabet.N]
	return customAlphabet(str.join(''), length)()
}

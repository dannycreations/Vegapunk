import { customAlphabet } from 'nanoid'

let idCounter = 0

export function uniqId(prefix = '') {
	return `${prefix}${++idCounter}`
}

export enum Alphabet {
	L = 'abcdefghijklmnopqrstuvwxyz',
	U = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
	N = '0123456789',
	S = '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~',
}

export function randomString(length = 30, ...str: Alphabet[]): string {
	str = str.length ? str : [Alphabet.L, Alphabet.U, Alphabet.N]
	return customAlphabet(str.join(''), length)()
}

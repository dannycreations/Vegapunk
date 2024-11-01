import { customAlphabet } from 'nanoid'

export enum Alphabet {
	L = 'abcdefghijklmnopqrstuvwxyz',
	U = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
	N = '0123456789',
	S = '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~',
}

export function randomString(length = 30, ...args: Alphabet[]): string {
	args = args.length ? args : [Alphabet.L, Alphabet.U, Alphabet.N]
	return customAlphabet(args.join(''), length)()
}

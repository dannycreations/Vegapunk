import { customAlphabet } from 'nanoid'

export const Alphabet = {
	L: 'abcdefghijklmnopqrstuvwxyz',
	U: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
	N: '0123456789',
	S: '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~',
}

export function randomString(length = 30, ...args: string[]): string {
	args = args.length ? args : [Alphabet.L, Alphabet.U, Alphabet.N]
	return customAlphabet(args.join(''), length)()
}

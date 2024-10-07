export type NestedKeyOf<T, Key extends keyof T = keyof T> = Key extends string
	? T[Key] extends object
		? `${Key}.${NestedKeyOf<T[Key], keyof T[Key]>}` | Key
		: Key
	: never

export type OnlyOneRequired<T, Keys extends keyof T> = Pick<T, Exclude<keyof T, Keys>> &
	{ [K in Keys]-?: Partial<Record<Exclude<Keys, K>, never>> & Required<Pick<T, K>> }[Keys]

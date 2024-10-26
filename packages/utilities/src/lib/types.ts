import { Sub } from './internal/types'

// https://github.com/sapphiredev/utilities/blob/main/packages/utilities/src/lib/types.ts
export type Nullish = null | undefined

export type NonNullObject = {} & object

export type Primitive = string | number | boolean | bigint | symbol | undefined | null

export type Builtin = Primitive | Function | Date | Error | RegExp

export type AbstractConstructor<T> = abstract new (...args: any[]) => T

export type DeepReadonly<T> = T extends Builtin
	? T
	: T extends AbstractConstructor<unknown> | ((...args: any[]) => unknown)
	? T
	: T extends ReadonlyMap<infer K, infer V>
	? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
	: T extends ReadonlySet<infer U>
	? ReadonlySet<DeepReadonly<U>>
	: T extends readonly [] | readonly [...never[]]
	? readonly []
	: T extends readonly [infer U, ...infer V]
	? readonly [DeepReadonly<U>, ...DeepReadonly<V>]
	: T extends readonly [...infer U, infer V]
	? readonly [...DeepReadonly<U>, DeepReadonly<V>]
	: T extends ReadonlyArray<infer U>
	? ReadonlyArray<DeepReadonly<U>>
	: T extends object
	? { readonly [K in keyof T]: DeepReadonly<T[K]> }
	: unknown

export type DeepRequired<T> = T extends Builtin
	? NonNullable<T>
	: T extends Map<infer K, infer V>
	? Map<DeepRequired<K>, DeepRequired<V>>
	: T extends ReadonlyMap<infer K, infer V>
	? ReadonlyMap<DeepRequired<K>, DeepRequired<V>>
	: T extends WeakMap<infer K, infer V>
	? WeakMap<DeepRequired<K>, DeepRequired<V>>
	: T extends Set<infer U>
	? Set<DeepRequired<U>>
	: T extends ReadonlySet<infer U>
	? ReadonlySet<DeepRequired<U>>
	: T extends WeakSet<infer U>
	? WeakSet<DeepRequired<U>>
	: T extends Promise<infer U>
	? Promise<DeepRequired<U>>
	: T extends {}
	? { [K in keyof T]-?: DeepRequired<T[K]> }
	: NonNullable<T>

export type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends Array<infer U>
		? Array<DeepPartial<U>>
		: T[P] extends ReadonlyArray<infer U>
		? ReadonlyArray<DeepPartial<U>>
		: DeepPartial<T[P]>
}

export type RequiredExcept<T, K extends keyof T> = Partial<Pick<T, K>> & Required<Omit<T, K>>

export type PartialExcept<T, K extends keyof T> = Partial<Omit<T, K>> & Required<Pick<T, K>>

export type NonNullableObject<T> = {
	[P in keyof T]: NonNullable<T[P]>
}

export type StrictObject<T> = {
	[P in keyof T]-?: NonNullable<T[P]>
}

export type MutableObject<T> = {
	-readonly [P in keyof T]: T[P] extends Array<unknown> | NonNullObject ? MutableObject<T[P]> : T[P]
}

export type Awaitable<T> = PromiseLike<T> | T

export type OnlyOneRequired<T, Key extends keyof T> = Pick<T, Exclude<keyof T, Key>> &
	{ [K in Key]-?: Partial<Record<Exclude<Key, K>, never>> & Required<Pick<T, K>> }[Key]

export type NestedKeyOf<T, D extends number = 5> = D extends 0
	? never
	: T extends Array<infer I>
	? `${number}.${NestedKeyOf<I, Sub<D, 1>>}` | `${number}`
	: T extends object
	? { [K in keyof T]: K extends string ? `${K}.${NestedKeyOf<T[K], Sub<D, 1>>}` | K : never }[keyof T]
	: never

export type ValueAtPath<T, P, D extends number = 5> = D extends 0
	? never
	: P extends `${infer A}.${infer B}`
	? T extends Array<infer I>
		? ValueAtPath<I, B, Sub<D, 1>>
		: A extends keyof T
		? ValueAtPath<NonNullable<T[A]>, B, Sub<D, 1>>
		: never
	: P extends keyof T
	? T[P]
	: never

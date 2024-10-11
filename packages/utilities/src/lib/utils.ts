// https://github.com/sapphiredev/utilities/blob/main/packages/utilities/src/lib/lazy.ts
export function lazy<T>(cb: () => T) {
	let defaultValue: T
	return () => (defaultValue ??= cb())
}

export function isObject(val: unknown): val is Record<string, unknown> {
	return val !== null && typeof val === 'object' && !Array.isArray(val)
}

export function defaultsDeep<T>(target: T, ...sources: Partial<T>[]) {
	sources.forEach((source) => {
		if (!isObject(source)) return
		Object.entries(source).forEach(([key, sourceValue]) => {
			const targetValue = (target as Record<string, unknown>)[key]
			if (isObject(targetValue) && isObject(sourceValue)) {
				defaultsDeep(targetValue, sourceValue)
			} else if (targetValue === undefined) {
				;(target as Record<string, unknown>)[key] = sourceValue
			}
		})
	})
	return target
}

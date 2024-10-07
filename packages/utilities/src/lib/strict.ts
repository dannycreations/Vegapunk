import { has } from 'lodash'
import { NestedKeyOf } from './types'

export function strictHas<T>(obj: T, path: NestedKeyOf<T>) {
	return has<T>(obj, path)
}

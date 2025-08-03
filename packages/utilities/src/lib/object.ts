import { get, has } from 'es-toolkit/compat';

import type { NestedKeyOf, ValueAtPath } from './types';

export function strictGet<T, P extends NestedKeyOf<T> = NestedKeyOf<T>, V extends ValueAtPath<T, P> = ValueAtPath<T, P>>(obj: T, path: P, value?: V) {
  return get(obj, path, value) as NonNullable<ValueAtPath<T, P>> | V;
}

export function strictHas<T, P extends NestedKeyOf<T> = NestedKeyOf<T>>(obj: T, path: P) {
  return has(obj, path) as boolean;
}

import { get, has, isObjectLike } from 'es-toolkit/compat'
import { type NestedKeyOf, type ValueAtPath } from './types'

/**
 * Recursively assigns default properties from one or more source objects to a
 * target object, mutating the `target` object in place.
 *
 * Properties are assigned from a source object to the target object only if the
 * corresponding property in the `target` is `undefined`. If a property's value
 * is an object in both the `target` and a `source` (as determined by the
 * `isObjectLike` utility from `es-toolkit/compat`), `defaultsDeep` is called
 * recursively on these nested objects. Properties named `__proto__` or
 * `constructor` from source objects are ignored to prevent prototype pollution.
 *
 * @example
 * const target = { a: 1, b: { c: 2 } };
 * const source1 = { b: { d: 3 }, e: 4 };
 * const source2 = { a: 10, b: { c: 20, d: 30 }, f: 5 };
 *
 * defaultsDeep(target, source1, source2);
 * // target is now { a: 1, b: { c: 2, d: 3 }, e: 4, f: 5 }
 *
 * const obj1 = { user: { name: 'John' } };
 * const obj2 = { user: { age: 30 }, city: 'New York' };
 * defaultsDeep(obj1, obj2);
 * // obj1 is now { user: { name: 'John', age: 30 }, city: 'New York' }
 *
 * @template A The base type of the target object.
 * @template B The type of the source objects. Must be assignable to `A`, and
 *   defaults to `A` if not specified.
 * @param {Partial<A>} target The destination object. This object is modified
 *   directly and augmented with default properties from the source objects.
 * @param {...Partial<B>} sources One or more source objects from which default
 *   properties are copied. Source arguments that are not object-like (as per
 *   `isObjectLike` from `es-toolkit/compat`) are ignored.
 * @returns {A & B} The `target` object, augmented with properties from the
 *   `sources`.
 */
export function defaultsDeep<A, B extends A = A>(target: Partial<A>, ...sources: Partial<B>[]): A & B {
  for (const source of sources) {
    if (!isObjectLike(source)) continue
    for (const [key, sourceValue] of Object.entries(source)) {
      if (key === '__proto__' || key === 'constructor') continue

      const targetValue = target[key as keyof A]
      if (isObjectLike(targetValue) && isObjectLike(sourceValue)) {
        defaultsDeep(targetValue, sourceValue)
      } else if (typeof targetValue === 'undefined') {
        target[key as keyof A] = sourceValue as A[keyof A]
      }
    }
  }
  return target as A & B
}

export function strictGet<T, P extends NestedKeyOf<T> = NestedKeyOf<T>, V extends ValueAtPath<T, P> = ValueAtPath<T, P>>(obj: T, path: P, value?: V) {
  return get(obj, path, value) as NonNullable<ValueAtPath<T, P>> | V
}

export function strictHas<T, P extends NestedKeyOf<T> = NestedKeyOf<T>>(obj: T, path: P) {
  return has(obj, path) as boolean
}

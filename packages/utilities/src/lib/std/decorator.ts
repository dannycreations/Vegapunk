/**
 * A factory that returns a property decorator to configure a property's
 * enumerability and writability upon its first assignment.
 *
 * This decorator intercepts the first `set` operation on a property. During this
 * operation, it redefines the property using `Reflect.defineProperty`, applying
 * the specified `hidden` and `readonly` configurations. After the first assignment,
 * the property becomes non-configurable.
 *
 * @example
 * ```typescript
 * class User {
 *   @SetProperty(false, true)
 *   id: string; // Public and readonly after first assignment
 *
 *   @SetProperty(true, false)
 *   internalState: object; // Hidden (non-enumerable) and writable
 *
 *   constructor(id: string) {
 *     this.id = id; // This first assignment makes the property readonly.
 *     this.internalState = {};
 *   }
 * }
 *
 * const user = new User('user-123');
 * console.log(user.id); // 'user-123'
 * console.log(Object.keys(user)); // ['id']
 *
 * try {
 *   // This assignment will throw a TypeError in strict mode.
 *   user.id = 'new-id';
 * } catch (e) {
 *   console.error(e);
 * }
 * ```
 *
 * @param {boolean=} [hidden=false] If `true`, the property will not be enumerable.
 * @param {boolean=} [readonly=false] If `true`, the property becomes read-only
 *   after the initial value is assigned.
 * @returns {PropertyDecorator} A property decorator function that can be applied to a class property.
 */
export function SetProperty(hidden?: boolean, readonly?: boolean): PropertyDecorator {
  return (target: object, key: string | symbol): void => {
    Reflect.defineProperty(target, key, {
      enumerable: !hidden,
      set(this: object, value: unknown) {
        Reflect.defineProperty(this, key, {
          configurable: false,
          enumerable: !hidden,
          writable: !readonly,
          value,
        });
      },
    });
  };
}

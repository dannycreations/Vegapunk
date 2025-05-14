// https://softwaremill.com/developing-type-level-algorithms-in-typescript/#basic-algebra
export type Add<A extends number, B extends number> = Length<Concat<CreateArrOfLen<A>, CreateArrOfLen<B>>>

export type Sub<A extends number, B extends number> = CreateArrOfLen<A> extends [...CreateArrOfLen<B>, ...infer U] ? Length<U> : 0

type Append<T extends unknown[], U> = [...T, U]

type CreateArrOfLen<N extends number, CurrArr extends unknown[] = []> = CurrArr['length'] extends N
  ? CurrArr
  : CreateArrOfLen<N, Append<CurrArr, unknown>>

type Concat<A extends unknown[], B extends unknown[]> = [...A, ...B]

type Length<T extends unknown[]> = T['length'] extends number ? T['length'] : never

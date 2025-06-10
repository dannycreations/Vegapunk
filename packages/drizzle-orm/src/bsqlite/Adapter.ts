import { isObjectLike } from '@vegapunk/utilities/common'
import { Result } from '@vegapunk/utilities/result'
import { count, getTableName, sql, type InferInsertModel, type InferSelectModel, type SQL, type Table } from 'drizzle-orm'
import { type BetterSQLite3Database, type BetterSQLiteSession } from 'drizzle-orm/better-sqlite3'
import { type SQLiteSyncDialect } from 'drizzle-orm/sqlite-core'

export class Adapter<A extends Table, Select extends InferSelectModel<A>, Insert extends InferInsertModel<A>> {
  public constructor(db: BetterSQLite3Database, table: A) {
    Result.assert('id' in table, `The "${getTableName(table)}" table must have a primary key column "id"`)

    this.db = db
    this.table = table
  }

  public count(filter: QueryFilter<A> = {}): Result<number, Error> {
    return Result.from(() => {
      const query = this.db.select({ count: count() }).from(this.table)
      if (this.hasKeys(filter)) {
        query.where(this.buildWhereClause(filter))
      }
      return query.get()?.count ?? 0
    })
  }

  public find<B extends Table, R extends ReturnFilter<A, B>>(
    filter: QueryFilter<A> = {},
    options: QueryOptions<A, B, R> = {},
  ): Result<Array<ReturnAlias<A, B, R>>, Error> {
    return Result.from(() => {
      const select = this.buildSelectClause(options.select, options.joins)
      const query = this.db.select(select).from(this.table)
      if (this.hasKeys(options.joins)) {
        for (const join of options.joins) {
          if (!this.hasKeys(join)) {
            continue
          }

          let type: 'leftJoin' | 'rightJoin' | 'fullJoin' | 'innerJoin' = 'innerJoin'
          if (join.type === 'left') {
            type = 'leftJoin'
          } else if (join.type === 'right') {
            type = 'rightJoin'
          } else if (join.type === 'full') {
            type = 'fullJoin'
          }

          const conditions = Object.entries(join.on).map(([leftKey, rightKey]) => {
            const leftTable = this.table[leftKey as keyof A]
            const rightTable = join.table[rightKey as keyof B]
            return sql`${leftTable} = ${rightTable}`
          })
          query[type](join.table, sql`(${sql.join(conditions, sql.raw(' and '))})`)
        }
      }
      if (this.hasKeys(filter)) {
        query.where(this.buildWhereClause(filter))
      }
      if (this.hasKeys(options.order)) {
        query.orderBy(this.buildOrderClause(options.order, options.joins))
      }
      if (typeof options.limit === 'number') {
        query.limit(options.limit)
      }
      if (typeof options.offset === 'number') {
        query.offset(options.offset)
      }
      return query.all() as unknown as Array<ReturnAlias<A, B, R>>
    })
  }

  public findOne<B extends Table, R extends ReturnFilter<A, B>>(
    filter: QueryFilter<A> = {},
    options: Omit<QueryOptions<A, B, R>, 'limit'> = {},
  ): Result<ReturnAlias<A, B, R> | null, Error> {
    const record = this.find(filter, { ...options, limit: 1 })
    return record.map((r) => r[0] ?? null)
  }

  public findOneAndUpdate<B extends Table, R extends ReturnFilter<A, B>>(
    filter: QueryFilter<A>,
    data: Partial<Omit<Insert, 'id'>>,
    options: Omit<QueryOptions<A, B, R>, 'limit' | 'joins'> & {
      upsert?: boolean
    } = {},
  ): Result<ReturnAlias<A, B, R> | null, Error> {
    if (!this.hasKeys(data)) {
      return Result.ok(null)
    }

    const record = this.findOne(filter, { ...options, select: undefined })
    return record.mapInto((r) => {
      if (options.upsert && r === null) {
        // ! TODO: normalize QueryFilter before using it as { ...filter, ...data }
        const inserted = this.insert({ ...data } as Insert, options)
        return inserted.map((r) => r[0] as ReturnAlias<A, B, R>)
      } else {
        const updated = this.update({ ...r, ...data } as Select, options)
        return updated.map((r) => r[0] as ReturnAlias<A, B, R>)
      }
    })
  }

  public findOneAndDelete<B extends Table, R extends ReturnFilter<A, B>>(
    filter: QueryFilter<A> = {},
    options: Omit<QueryOptions<A, B, R>, 'limit' | 'joins'> = {},
  ): Result<ReturnAlias<A, B, R> | null, Error> {
    const record = this.findOne(filter, { ...options, select: undefined })
    return record.mapInto((r) => {
      if (r === null) {
        return Result.ok(r)
      }

      const deleted = this.delete(r as Select, options)
      return deleted.map((r) => r[0] as ReturnAlias<A, B, R>)
    })
  }

  public insert<B extends Table, R extends ReturnFilter<A, B>>(
    record: Omit<Insert, 'id'> | Array<Omit<Insert, 'id'>>,
    options: Pick<QueryOptions<A, B, R>, 'select'> & {
      conflict?: {
        target: Array<keyof Omit<Insert, 'id'>>
        set?: { [K in keyof Omit<Insert, 'id'>]?: Insert[K] | SQL<A> }
        resolution?: 'ignore' | 'update' | 'merge'
      }
    } = {},
  ): Result<Array<ReturnAlias<A, B, R>>, Error> {
    return Result.from(() => {
      const records = (Array.isArray(record) ? record : [record]).filter(this.hasKeys)
      if (records.length < 1) {
        return []
      }

      const values = records.map((rec) => {
        const { id, ...rest } = rec as Record<string, unknown>
        return Object.fromEntries(Object.entries(rest).map(([key, value]) => [key, value]))
      })

      const query = this.db.insert(this.table).values(values as Insert[])
      query.returning(this.buildSelectClause(options.select))
      if (this.hasKeys(options.conflict)) {
        const { target, set, resolution } = options.conflict
        const record: Record<string, unknown> = this.hasKeys(set) ? set : records[0]

        const columns = target.map((key) => sql`${this.table[key as keyof A]}`)
        const targets = sql.join(columns, sql.raw(', '))

        const { id, ...rest } = record
        if (resolution === 'ignore') {
          query.onConflictDoNothing({ target: targets })
        } else if (resolution === 'update') {
          query.onConflictDoUpdate({ target: targets, set: rest as Insert })
        } else {
          query.onConflictDoUpdate({
            target: targets,
            set: Object.fromEntries(
              Object.entries(rest).map(([key, value]) => {
                const column = this.table[key as keyof A]
                return [key, sql`coalesce(${column}, ${sql`${value}`})`]
              }),
            ) as Record<string, unknown>,
          })
        }
      }
      return query.all() as unknown as Array<ReturnAlias<A, B, R>>
    })
  }

  public update<B extends Table, R extends ReturnFilter<A, B>>(
    record: Select,
    options: Pick<QueryOptions<A, B, R>, 'limit' | 'order' | 'select'> = {},
  ): Result<Array<ReturnAlias<A, B, R>>, Error> {
    return Result.from(() => {
      const { id, ...set } = record
      const query = this.db.update(this.table).set(set as Select)
      query.where(this.buildWhereClause({ id }))
      query.returning(this.buildSelectClause(options.select))
      if (this.hasKeys(options.order)) {
        query.orderBy(this.buildOrderClause(options.order))
      }
      if (typeof options.limit === 'number') {
        query.limit(options.limit)
      }
      return query.all() as unknown as Array<ReturnAlias<A, B, R>>
    })
  }

  public delete<B extends Table, R extends ReturnFilter<A, B>>(
    record: Select,
    options: Pick<QueryOptions<A, B, R>, 'limit' | 'order' | 'select'> = {},
  ): Result<Array<ReturnAlias<A, B, R>>, Error> {
    return Result.from(() => {
      const query = this.db.delete(this.table)
      query.where(this.buildWhereClause({ id: record.id }))
      query.returning(this.buildSelectClause(options.select))
      if (this.hasKeys(options.order)) {
        query.orderBy(this.buildOrderClause(options.order))
      }
      if (typeof options.limit === 'number') {
        query.limit(options.limit)
      }
      return query.all() as unknown as Array<ReturnAlias<A, B, R>>
    })
  }

  protected buildWhereClause(filter: QueryFilter<A>): SQL {
    const conditions = this.processWhereLogical(filter)
    if (conditions.length > 0) {
      return sql`(${sql.join(conditions, sql.raw(' and '))})`
    } else {
      return undefined as unknown as SQL
    }
  }

  protected processWhereLogical(filter: QueryFilter<A>): SQL[] {
    return Object.entries(filter).flatMap(([key, value]) => {
      switch (key as keyof LogicalOperator<A> & '$not') {
        default: {
          const column = this.table[key as keyof A]
          return this.processWhereComparison(column, value)
        }
        case '$and':
        case '$nand':
        case '$or':
        case '$nor': {
          const joinType = ['$or', '$nor'].includes(key) ? ' or ' : ' and '
          const nestedClauses = (value as QueryFilter<A>[]).map((subFilter) => {
            const nestedConditions = this.processWhereLogical(subFilter)
            if (nestedConditions.length === 0) {
              return sql`true`
            } else if (nestedConditions.length === 1) {
              return nestedConditions[0]
            }
            return sql`(${sql.join(nestedConditions, sql.raw(joinType))})`
          })
          if (nestedClauses.length === 0) {
            return sql`true`
          } else if (nestedClauses.length === 1) {
            return nestedClauses[0]
          } else if (['$nand', '$nor'].includes(key)) {
            return sql`not (${sql.join(nestedClauses, sql.raw(' and '))})`
          }
          return sql`(${sql.join(nestedClauses, sql.raw(joinType))})`
        }
        case '$not': {
          const negatedConditions = this.processWhereLogical(value as QueryFilter<A>)
          if (negatedConditions.length === 0) {
            return sql`false`
          } else if (negatedConditions.length === 1) {
            return sql`not ${negatedConditions[0]}`
          }
          return sql`not (${sql.join(negatedConditions, sql.raw(' and '))})`
        }
      }
    })
  }

  protected processWhereComparison(column: unknown, value: unknown): SQL[] {
    const condition = (value = isObjectLike(value) ? value : { $eq: value })
    return Object.entries(condition).flatMap(([operator, operand]) => {
      // forget why choose ==, so ...
      if (operand == null) {
        return sql`false`
      }

      switch (operator as keyof ComparisonOperator<unknown> & '$not') {
        default: // default to $eq
          return sql`${column} = ${sql`${operand}`}`
        case '$ne':
          return sql`${column} <> ${sql`${operand}`}`
        case '$gt':
          return sql`${column} > ${sql`${operand}`}`
        case '$gte':
          return sql`${column} >= ${sql`${operand}`}`
        case '$lt':
          return sql`${column} < ${sql`${operand}`}`
        case '$lte':
          return sql`${column} <= ${sql`${operand}`}`
        case '$glob':
          return sql`${column} glob ${sql`${operand}`}`
        case '$nglob':
          return sql`${column} not glob ${sql`${operand}`}`
        case '$like':
          return sql`${column} like ${sql`${operand}`}`
        case '$nlike':
          return sql`${column} not like ${sql`${operand}`}`
        case '$in':
          if (Array.isArray(operand) && operand.length) {
            return sql`${column} in (${sql.join(operand, sql.raw(', '))})`
          } else {
            return sql`false`
          }
        case '$nin':
          if (Array.isArray(operand) && operand.length) {
            return sql`${column} not in (${sql.join(operand, sql.raw(', '))})`
          } else {
            return sql`true`
          }
        case '$null':
          return sql`${column} is ${sql.raw(operand ? 'null' : 'not null')}`
        case '$not':
          const negatedConditions = this.processWhereComparison(column, operand)
          if (negatedConditions.length === 0) {
            return sql`false`
          } else if (negatedConditions.length === 1) {
            return sql`not ${negatedConditions[0]}`
          }
          return sql`not (${sql.join(negatedConditions, sql.raw(' and '))})`
      }
    })
  }

  protected buildOrderClause<S, B extends Table>(order?: S, joins?: Array<JoinOptions<A, B>>): SQL {
    if (!order || !this.hasKeys(order)) {
      return undefined as unknown as SQL
    }

    const conditions = Object.entries(order).map(([key, direction]) => {
      let column: unknown = this.table[key as keyof A]
      if (!column && joins?.length) {
        const join = joins.find(({ table }) => key in table)
        if (join) {
          column = join.table[key as keyof B]
        }
      }
      return sql`${column} ${sql.raw(String(direction ?? 'asc'))}`
    })
    return sql.join(conditions, sql.raw(', '))
  }

  protected buildSelectClause<S, B extends Table>(select?: S, joins?: Array<JoinOptions<A, B>>): InferColumn<A> {
    if (!select || !this.hasKeys(select)) {
      return undefined as unknown as InferColumn<A>
    }

    const columns = Object.fromEntries(
      Object.keys(select).map((key) => {
        let column: unknown = this.table[key as keyof A]
        if (!column && joins?.length) {
          const join = joins.find(({ table }) => key in table)
          if (join) {
            column = join.table[key as keyof B]
          }
        }
        return [key, column]
      }),
    )
    return columns as InferColumn<A>
  }

  protected hasKeys(obj?: object): obj is object {
    return obj ? Object.keys(obj).length > 0 : false
  }

  protected get dialect(): SQLiteSyncDialect {
    // @ts-expect-error
    return this.db.dialect
  }

  protected get session(): BetterSQLiteSession<never, never> {
    // @ts-expect-error
    return this.db.session
  }

  protected readonly db: BetterSQLite3Database
  protected readonly table: A
}

interface ComparisonOperator<T> {
  $eq?: T
  $ne?: T
  $gt?: T
  $gte?: T
  $lt?: T
  $lte?: T
  $glob?: T
  $nglob?: T
  $like?: T
  $nlike?: T
  $in?: T[]
  $nin?: T[]
  $null?: boolean
}

interface LogicalOperator<T extends Table> {
  $and?: QueryBaseFilter<T>[]
  $nand?: QueryBaseFilter<T>[]
  $or?: QueryBaseFilter<T>[]
  $nor?: QueryBaseFilter<T>[]
}

type QueryFilter<A extends Table> = QueryBaseFilter<A> &
  LogicalOperator<A> & {
    $not?: QueryBaseFilter<A> & LogicalOperator<A>
  }

type QueryBaseFilter<A extends Table> = {
  [K in keyof InferSelect<A>]?:
    | InferSelect<A>[K]
    | ComparisonOperator<InferSelect<A>[K]>
    | {
        $not?: ComparisonOperator<InferSelect<A>[K]>
      }
}

interface QueryOptions<A extends Table, B extends Table, R> {
  select?: R
  limit?: number
  offset?: number
  order?: Partial<Record<keyof InferSelect<A>, 'asc' | 'desc'>>
  joins?: Array<JoinOptions<A, B>>
}

interface JoinOptions<A extends Table, B extends Table> {
  table: B
  on: { [K in keyof InferSelect<A>]?: keyof InferSelect<B> }
  type?: 'left' | 'right' | 'full' | 'inner'
}

type ReturnFilter<A extends Table, B extends Table> = Partial<Record<keyof ReturnMerge<A, B>, 1>>

type ReturnAlias<A extends Table, B extends Table, R> = B extends InferColumn<B>
  ? R extends Record<keyof R, 1>
    ? Omit<ReturnMerge<A, B>, Exclude<keyof ReturnMerge<A, B>, keyof R>>
    : { [K in A['_']['name']]: InferSelect<A> } & { [L in B['_']['name']]: InferSelect<B> }
  : Omit<InferSelect<A>, Exclude<keyof InferSelect<A>, keyof R>>

type ReturnMerge<A extends Table, B extends Table> = B extends InferColumn<B> ? InferSelect<A> & InferSelect<B> : InferSelect<A>

type InferSelect<T extends Table> = InferSelectModel<T>

type InferColumn<T extends Table> = T['_']['columns']

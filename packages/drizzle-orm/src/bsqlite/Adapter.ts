import { isObjectLike } from '@vegapunk/utilities/common'
import { Result } from '@vegapunk/utilities/result'
import { count, getTableName, sql, type InferInsertModel, type InferSelectModel, type SQL, type Table } from 'drizzle-orm'
import { type BetterSQLite3Database, type BetterSQLiteSession } from 'drizzle-orm/better-sqlite3'
import { type SQLiteSyncDialect } from 'drizzle-orm/sqlite-core'

export class Adapter<A extends Table, Select extends InferSelectModel<A>, Insert extends InferInsertModel<A>> {
	public constructor(private readonly db: BetterSQLite3Database, private readonly table: A) {
		if (!Object.keys(table).includes('id')) {
			throw new Error(`The "${getTableName(table)}" table must have a primary key column "id"`)
		}
	}

	public count(filter: QueryFilter<A> = {}): Result<number, Error> {
		return Result.from(() => {
			const db = this.db.select({ count: count() }).from(this.table)
			if (filter) db.where(this.buildWhereClause(filter))
			return db.get()?.count ?? 0
		})
	}

	public find<B extends Table, R extends ReturnFilter<A, B>>(
		filter: QueryFilter<A> = {},
		options: QueryOptions<A, B, R> = {},
	): Result<Array<ReturnAlias<A, B, R>>, Error> {
		return Result.from(() => {
			const select = this.buildSelectClause(options.select, options.joins)
			const db = this.db.select(select).from(this.table)
			if (Array.isArray(options.joins)) {
				for (const data of options.joins) {
					if (!this.hasKeys(data)) continue

					let type: 'leftJoin' | 'rightJoin' | 'fullJoin' | 'innerJoin' = 'innerJoin'
					if (data.type === 'left') type = 'leftJoin'
					else if (data.type === 'right') type = 'rightJoin'
					else if (data.type === 'full') type = 'fullJoin'

					const conditions = Object.entries(data.on).map(([leftKey, rightKey]) => {
						const leftTable = this.table[leftKey as keyof A]
						const rightTable = data.table[rightKey as keyof B]
						return sql`${leftTable} = ${rightTable}`
					})
					db[type](data.table, sql`(${sql.join(conditions, sql.raw(' and '))})`)
				}
			}
			if (filter) db.where(this.buildWhereClause(filter))
			if (options.order) db.orderBy(this.buildOrderClause(options.order, options.joins))
			if (typeof options.limit === 'number') db.limit(options.limit)
			if (typeof options.offset === 'number') db.offset(options.offset)
			return db.all() as unknown as Array<ReturnAlias<A, B, R>>
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
		if (!this.hasKeys(data)) return Result.ok(null)

		const record = this.findOne(filter, { ...options, select: undefined })
		return record.mapInto((r) => {
			if (options.upsert && r === null) {
				// ! TODO: clean QueryFilter before using it as { ...filter, ...data }
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
			if (r === null) return Result.ok(r)

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
			if (!records.length) return []

			const values = records.map((rec) => {
				const { id, ...rest } = rec as Record<string, unknown>
				return Object.fromEntries(Object.entries(rest).map(([key, value]) => [key, value]))
			})

			const db = this.db.insert(this.table).values(values as Insert[])
			db.returning(this.buildSelectClause(options.select))
			if (options.conflict) {
				const { target, set, resolution } = options.conflict
				let record: Record<string, unknown> = records[0]
				if (this.hasKeys(set)) record = set!

				const columns = target.map((key) => sql`${this.table[key as keyof A]}`)
				const targets = sql.join(columns, sql.raw(', '))

				const { id, ...rest } = record
				if (resolution === 'ignore') {
					db.onConflictDoNothing({ target: targets })
				} else if (resolution === 'update') {
					db.onConflictDoUpdate({ target: targets, set: rest as Insert })
				} else {
					db.onConflictDoUpdate({
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
			return db.all() as unknown as Array<ReturnAlias<A, B, R>>
		})
	}

	public update<B extends Table, R extends ReturnFilter<A, B>>(
		record: Select,
		options: Pick<QueryOptions<A, B, R>, 'limit' | 'order' | 'select'> = {},
	): Result<Array<ReturnAlias<A, B, R>>, Error> {
		return Result.from(() => {
			const { id, ...set } = record
			const db = this.db.update(this.table).set(set as Select)
			db.where(this.buildWhereClause({ id }))
			db.returning(this.buildSelectClause(options.select))
			if (options.order) db.orderBy(this.buildOrderClause(options.order))
			if (typeof options.limit === 'number') db.limit(options.limit)
			return db.all() as unknown as Array<ReturnAlias<A, B, R>>
		})
	}

	public delete<B extends Table, R extends ReturnFilter<A, B>>(
		record: Select,
		options: Pick<QueryOptions<A, B, R>, 'limit' | 'order' | 'select'> = {},
	): Result<Array<ReturnAlias<A, B, R>>, Error> {
		return Result.from(() => {
			const db = this.db.delete(this.table)
			db.where(this.buildWhereClause({ id: record.id }))
			db.returning(this.buildSelectClause(options.select))
			if (options.order) db.orderBy(this.buildOrderClause(options.order))
			if (typeof options.limit === 'number') db.limit(options.limit)
			return db.all() as unknown as Array<ReturnAlias<A, B, R>>
		})
	}

	private buildWhereClause(filter: QueryFilter<A>): SQL {
		const conditions = this.processWhereLogical(filter)
		return conditions.length ? sql`(${sql.join(conditions, sql.raw(' and '))})` : (undefined as unknown as SQL)
	}

	private processWhereLogical(filter: QueryFilter<A>): SQL[] {
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
						if (nestedConditions.length === 0) return sql`true`
						if (nestedConditions.length === 1) return nestedConditions[0]
						return sql`(${sql.join(nestedConditions, sql.raw(joinType))})`
					})
					if (nestedClauses.length === 0) return sql`true`
					if (nestedClauses.length === 1) return nestedClauses[0]
					if (['$nand', '$nor'].includes(key)) {
						return sql`not (${sql.join(nestedClauses, sql.raw(' and '))})`
					} else {
						return sql`(${sql.join(nestedClauses, sql.raw(joinType))})`
					}
				}
				case '$not': {
					const negatedConditions = this.processWhereLogical(value as QueryFilter<A>)
					if (negatedConditions.length === 0) return sql`false`
					if (negatedConditions.length === 1) return sql`not ${negatedConditions[0]}`
					return sql`not (${sql.join(negatedConditions, sql.raw(' and '))})`
				}
			}
		})
	}

	private processWhereComparison(column: unknown, value: unknown): SQL[] {
		const condition = (value = isObjectLike(value) ? value : { $eq: value })
		return Object.entries(condition).flatMap(([operator, operand]) => {
			if (operand == null) return sql`false`

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
					return Array.isArray(operand) && operand.length ? sql`${column} in (${sql.join(operand, sql.raw(', '))})` : sql`false`
				case '$nin':
					return Array.isArray(operand) && operand.length ? sql`${column} not in (${sql.join(operand, sql.raw(', '))})` : sql`true`
				case '$null':
					return sql`${column} is ${sql.raw(operand ? 'null' : 'not null')}`
				case '$not':
					const negatedConditions = this.processWhereComparison(column, operand)
					if (negatedConditions.length === 0) return sql`false`
					if (negatedConditions.length === 1) return sql`not ${negatedConditions[0]}`
					return sql`not (${sql.join(negatedConditions, sql.raw(' and '))})`
			}
		})
	}

	private buildOrderClause<S, B extends Table>(order?: S, joins?: Array<JoinOptions<A, B>>): SQL {
		if (!order || !this.hasKeys(order)) return undefined as unknown as SQL

		const conditions = Object.entries(order).map(([key, direction]) => {
			let column: unknown = this.table[key as keyof A]
			if (!column && joins?.length) {
				const join = joins.find(({ table }) => key in table)
				if (join) column = join.table[key as keyof B]
			}
			return sql`${column} ${sql.raw(String(direction ?? 'asc'))}`
		})
		return sql.join(conditions, sql.raw(', '))
	}

	private buildSelectClause<S, B extends Table>(select?: S, joins?: Array<JoinOptions<A, B>>): InferColumn<A> {
		if (!select || !this.hasKeys(select)) return undefined as unknown as InferColumn<A>

		const columns = Object.fromEntries(
			Object.keys(select).map((key) => {
				let column: unknown = this.table[key as keyof A]
				if (!column && joins?.length) {
					const join = joins.find(({ table }) => key in table)
					if (join) column = join.table[key as keyof B]
				}
				return [key, column]
			}),
		)
		return columns as InferColumn<A>
	}

	private hasKeys(obj?: object): boolean {
		return !!Object.keys(obj ?? {}).length
	}

	protected get dialect(): SQLiteSyncDialect {
		// @ts-expect-error
		return this.db.dialect
	}

	protected get session(): BetterSQLiteSession<never, never> {
		// @ts-expect-error
		return this.db.session
	}
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

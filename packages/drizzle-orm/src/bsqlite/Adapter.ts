import { isObjectLike } from '@vegapunk/utilities/es-toolkit'
import { Result } from '@vegapunk/utilities/result'
import { getTableName, InferInsertModel, InferSelectModel, SQL, sql, Table } from 'drizzle-orm'
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { SQLiteInsertConfig, SQLiteSyncDialect, SQLiteTableWithColumns } from 'drizzle-orm/sqlite-core'
import { getColumnName, reverseCase } from './utils'

const OperatorMap = {
	$eq: (k, v) => sql`${k} = ${v}`,
	$ne: (k, v) => sql`${k} <> ${v}`,
	$gt: (k, v) => sql`${k} > ${v}`,
	$gte: (k, v) => sql`${k} >= ${v}`,
	$lt: (k, v) => sql`${k} < ${v}`,
	$lte: (k, v) => sql`${k} <= ${v}`,
	$in: (k, v) => (Array.isArray(v) && v.length ? sql`${k} IN (${sql.raw(v.join(','))})` : sql``),
	$nin: (k, v) => (Array.isArray(v) && v.length ? sql`${k} NOT IN (${sql.raw(v.join(','))})` : sql``),
	$exists: (k, v) => sql`${k} IS ${sql.raw(v ? 'NOT NULL' : 'NULL')}`,
	$like: (k, v) => sql`${k} LIKE ${v}`,
} as const satisfies Record<keyof QueryOperator, (k: unknown, v: unknown) => SQL>

export class Adapter<A extends Table, Select extends InferSelectModel<A>, Insert extends InferInsertModel<A>> {
	public constructor(private readonly db: BetterSQLite3Database, private readonly table: A) {
		if (!Object.keys(table).includes('id')) {
			throw new Error(`The "${getTableName(table)}" table must have a primary key column "id"`)
		}

		// @ts-expect-error
		this.dialect = this.db.dialect
	}

	public count(filter: QueryFilter<A> = {}): Result<number, Error> {
		return Result.from(() => {
			const whereClause = this.buildWhereClause(filter)

			const query = sql`SELECT COUNT(*) AS count FROM ${this.table} ${whereClause}`
			return this.db.get<{ count: number }>(query).count
		})
	}

	public find<B extends Table, R extends ReturnFilter<A, B>>(
		filter: QueryFilter<A> = {},
		options: QueryOptions<A, B, R> & {
			joins?: JoinOptions<A, B>[]
		} = {},
	): Result<ReturnAlias<A, B, R>[], Error> {
		return Result.from(() => {
			const selectClause = this.buildSelectClause(options.select, options.joins)
			const whereClause = this.buildWhereClause(filter)
			const sortClause = this.buildSortClause(options.sort)
			const limitClause = this.buildLimitClause(options.limit)
			const skipClause = options.skip ? sql`OFFSET ${options.skip}` : sql``
			const joinClauses = this.buildJoinClause(options.joins)

			const query = sql`SELECT ${selectClause} FROM ${this.table} ${joinClauses} ${whereClause} ${sortClause} ${limitClause} ${skipClause}`
			return this.buildReturnAlias<B, R>(this.db.all(query))
		})
	}

	public findOne<B extends Table, R extends ReturnFilter<A, B>>(
		filter: QueryFilter<A> = {},
		options: Omit<QueryOptions<A, B, R>, 'limit'> = {},
	): Result<ReturnAlias<A, B, R> | null, Error> {
		const record = this.find(filter, { ...options, limit: 1 })
		return record.isErr() ? record : Result.ok(record.unwrap()[0] ?? null)
	}

	public findOneAndUpdate<B extends Table, R extends ReturnFilter<A, B>>(
		filter: QueryFilter<A>,
		data: Partial<Omit<Insert, 'id'>>,
		options: Omit<QueryOptions<A, B, R>, 'limit'> & { upsert?: boolean } = {},
	): Result<ReturnAlias<A, B, R>, Error> {
		const record = this.findOne(filter, { ...options, select: undefined })
		if (record.isErr()) return record
		else if (options.upsert && record.isOk() && record.contains(null)) {
			const inserted = this.insert({ ...filter, ...data } as Insert, options)
			// @ts-expect-error
			return inserted.isErr() ? inserted : Result.ok(inserted.unwrap()[0])
		} else {
			const updated = this.update({ ...record, ...data } as Select, options)
			return updated.isErr() ? updated : Result.ok(updated.unwrap()[0])
		}
	}

	public findOneAndDelete<B extends Table, R extends ReturnFilter<A, B>>(
		filter: QueryFilter<A> = {},
		options: Omit<QueryOptions<A, B, R>, 'limit'> = {},
	): Result<ReturnAlias<A, B, R> | null, Error> {
		const record = this.findOne(filter, { ...options, select: undefined })
		if (record.isErr()) return record
		else if (record.isOk() && record.isOkAnd(isObjectLike)) {
			const deleted = this.delete(record as object as Select, options)
			return deleted.isErr() ? deleted : Result.ok(deleted.unwrap()[0])
		} else {
			return Result.ok(null)
		}
	}

	public insert<B extends Table, R extends ReturnFilter<A, B>>(
		record: Omit<Insert, 'id'> | Omit<Insert, 'id'>[],
		options: Pick<QueryOptions<A, B, R>, 'select'> & {
			conflict?: {
				target: (keyof Omit<Insert, 'id'>)[]
				set: Partial<{ [K in keyof Omit<Insert, 'id'>]: Insert[K] | SQL<A> }>
				resolution?: 'ignore' | 'replace' | 'update' | 'merge'
			}
		} = {},
	): Result<ReturnAlias<A, B, R>[], Error> {
		return Result.from(() => {
			const keys = (r: object) => !!Object.keys(r).length
			const records = (Array.isArray(record) ? record : [record]).filter(keys)
			if (!records.length) return []

			const payload: SQLiteInsertConfig = {
				table: this.table,
				values: records.map((rec) => {
					const { id, ...rest } = rec as Record<string, unknown>
					return Object.fromEntries(Object.entries(rest).map(([key, value]) => [key, sql`${value}`]))
				}),
			}

			if (options.conflict) {
				let record: Record<string, unknown>
				if (options.conflict.set && keys(options.conflict.set)) {
					record = options.conflict.set
				} else {
					record = records[0]
				}

				const targets = sql.join(
					options.conflict.target.map((key) => sql.raw(getColumnName(this.table, key))),
					sql.raw(','),
				)

				switch (options.conflict.resolution) {
					case 'ignore':
						payload.onConflict = sql`(${targets}) DO NOTHING`
						break
					case 'replace':
						payload.onConflict = sql`(${targets}) DO REPLACE`
						break
					case 'update':
						const updateClause = this.dialect.buildUpdateSet(this.table, record as Insert)
						payload.onConflict = sql`(${targets}) DO UPDATE SET ${updateClause}`
						break
					case 'merge':
					default:
						const { id, ...rest } = record as Record<string, unknown>
						const values = Object.fromEntries(
							Object.entries(rest).map(([key, value]) => {
								return [key, sql`${getColumnName(this.table, key)} = COALESCE(${getColumnName(this.table, key)}, ${value})`]
							}),
						)
						const mergeClause = this.dialect.buildUpdateSet(this.table, values)
						payload.onConflict = sql`(${targets}) DO UPDATE SET ${mergeClause}`
						break
				}
			}

			const insertQuery = this.dialect.buildInsertQuery(payload)
			const selectClause = this.buildSelectClause(options.select)

			const query = sql`${insertQuery} RETURNING ${selectClause}`
			return this.buildReturnAlias<B, R>(this.db.all(query))
		})
	}

	public update<B extends Table, R extends ReturnFilter<A, B>>(
		record: Select,
		options: Pick<QueryOptions<A, B, R>, 'limit' | 'sort' | 'select'> = {},
	): Result<ReturnAlias<A, B, R>[], Error> {
		return Result.from(() => {
			const { id, ...set } = record
			const updateQuery = this.dialect.buildUpdateQuery({ table: this.table, set })
			const whereClause = this.buildWhereClause({ id: id! })
			const sortClause = this.buildSortClause(options.sort)
			const limitClause = this.buildLimitClause(options.limit)
			const selectClause = this.buildSelectClause(options.select)

			const query = sql`${updateQuery} ${whereClause} ${sortClause} ${limitClause} RETURNING ${selectClause}`
			return this.buildReturnAlias<B, R>(this.db.all(query))
		})
	}

	public delete<B extends Table, R extends ReturnFilter<A, B>>(
		record: Select,
		options: Pick<QueryOptions<A, B, R>, 'limit' | 'sort' | 'select'> = {},
	): Result<ReturnAlias<A, B, R>[], Error> {
		return Result.from(() => {
			const deleteQuery = this.dialect.buildDeleteQuery({ table: this.table })
			const whereClause = this.buildWhereClause({ id: record.id! })
			const sortClause = this.buildSortClause(options.sort)
			const limitClause = this.buildLimitClause(options.limit)
			const selectClause = this.buildSelectClause(options.select)

			const query = sql`${deleteQuery} ${whereClause} ${sortClause} ${limitClause} RETURNING ${selectClause}`
			return this.buildReturnAlias<B, R>(this.db.all(query))
		})
	}

	private buildWhereClause(filter: QueryFilter<A>): SQL {
		const conditions = Object.entries(filter).flatMap(([column, value]) => {
			const tableColumn = getColumnName(this.table, column)
			const condition = isObjectLike(value) ? value : { $eq: value }
			return Object.entries(condition).flatMap(([operator, operand]) => {
				return operand == null
					? OperatorMap.$exists(tableColumn, operator === '$ne')
					: OperatorMap[operator as keyof QueryOperator](tableColumn, operand)
			})
		})
		return conditions.length ? sql`WHERE ${sql.join(conditions, sql.raw(' AND '))}` : sql``
	}

	private buildJoinClause<B extends Table>(joins: JoinOptions<A, B>[] = []): SQL {
		const joinClauses = joins.map(({ type, table, on }) => {
			const onConditions = Object.entries(on).map(([leftKey, rightKey]) => {
				return sql`${getColumnName(this.table, leftKey)} = ${getColumnName(table, rightKey)}`
			})
			const onClause = sql.join(onConditions, sql.raw(' AND '))
			return sql`${sql.raw(type ?? 'INNER')} JOIN ${table} ON ${onClause}`
		})
		return sql.join(joinClauses, sql.raw(' '))
	}

	private buildLimitClause<L>(limit?: L): SQL {
		return limit ? sql`LIMIT ${sql`${limit}`}` : sql``
	}

	private buildSortClause<S>(sort?: S): SQL {
		const sortings = Object.entries(sort ?? {}).map(([column, direction]) => {
			return sql`${getColumnName(this.table, column)} ${sql.raw(String(direction ?? 'ASC'))}`
		})
		return sortings.length ? sql`ORDER BY ${sql.join(sortings, sql.raw(','))}` : sql``
	}

	private buildSelectClause<S, B extends Table>(select?: S, joins?: JoinOptions<A, B>[]): SQL {
		const columns = Object.keys(select ?? {})
			.map((key) => {
				const col =
					key in this.table // is left table
						? getColumnName(this.table, key)
						: joins?.find(({ table }) => key in table)?.table[key as keyof B]
				return col ? sql`${col}` : null
			})
			.filter(Boolean)
		return columns.length ? sql.join(columns as SQL[], sql.raw(',')) : sql`*`
	}

	private buildReturnAlias<B extends Table, R extends ReturnFilter<A, B>>(results: Select[]): ReturnAlias<A, B, R>[] {
		return results.map((result) => {
			return Object.entries(result).reduce((acc, [key, value]) => {
				return (acc[reverseCase(key)] = value), acc
			}, {} as Record<string, unknown>)
		}) as ReturnAlias<A, B, R>[]
	}

	private readonly dialect: SQLiteSyncDialect
}

type QueryOptions<A extends Table, B extends Table, R> = {
	limit?: number
	skip?: number
	sort?: Partial<Record<keyof ReturnMerge<A, B>, 'ASC' | 'DESC'>>
	select?: R
}

interface QueryOperator<T = unknown> {
	$eq?: T
	$ne?: T
	$gt?: T
	$gte?: T
	$lt?: T
	$lte?: T
	$in?: T[]
	$nin?: T[]
	$exists?: boolean
	$like?: T
}

type QueryFilter<A extends Table> = {
	[K in keyof InferSelect<A>]?: InferSelect<A>[K] | QueryOperator<InferSelect<A>[K]>
}

interface JoinOptions<A extends Table, B extends Table> {
	table: B
	on: JoinFilter<A, B>
	type?: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL'
}

type JoinFilter<A extends Table, B extends Table> = {
	[K in keyof InferSelect<A>]?: keyof InferSelect<B>
}

type ReturnFilter<A extends Table, B extends Table> = Partial<Record<keyof ReturnMerge<A, B>, 1>>

type ReturnAlias<A extends Table, B extends Table | undefined, R> = B extends SQLiteTableWithColumns<infer _>
	? R extends ReturnFilter<A, B>
		? Omit<ReturnMerge<A, B>, Exclude<keyof ReturnMerge<A, B>, keyof R>>
		: ReturnMerge<A, B>
	: Omit<InferSelect<A>, Exclude<keyof InferSelect<A>, keyof R>> | InferSelect<A>

type ReturnMerge<A extends Table, B extends Table> = B extends SQLiteTableWithColumns<infer _> ? InferSelect<A> & InferSelect<B> : InferSelect<A>

type InferSelect<T extends Table> = InferSelectModel<T>

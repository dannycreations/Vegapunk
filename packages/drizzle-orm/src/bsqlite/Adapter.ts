import { isObjectLike } from '@vegapunk/utilities'
import { getTableName, InferInsertModel, InferSelectModel, SQL, sql, Table } from 'drizzle-orm'
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { SQLiteSyncDialect, SQLiteTableWithColumns } from 'drizzle-orm/sqlite-core'

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

export class Adapter<Left extends Table, Select extends InferSelectModel<Left>, Insert extends InferInsertModel<Left>> {
	public constructor(private readonly db: BetterSQLite3Database, private readonly table: Left) {
		if (!Object.keys(table).includes('id')) {
			throw new Error(`The "${getTableName(table)}" table must have a primary key column "id"`)
		}

		// @ts-expect-error
		this.dialect = this.db.dialect
	}

	public count(filter: QueryFilter<Left> = {}): number {
		const whereClause = this.buildWhereClause(filter)

		const query = sql`SELECT COUNT(*) AS count FROM ${this.table} ${whereClause}`
		return this.db.get<{ count: number }>(query).count ?? 0
	}

	public find<Right extends Table, Result extends SelectResult<Left, Right>>(
		filter: QueryFilter<Left> = {},
		options: QueryOptions<Left, Right, Result> & {
			joins?: JoinOptions<Left, Right>[]
		} = {},
	): Array<ReturnResult<Left, Right, Result>> {
		const selectClause = this.buildSelectClause(options.select, options.joins)
		const whereClause = this.buildWhereClause(filter)
		const sortClause = this.buildSortClause(options.sort)
		const limitClause = this.buildLimitClause(options.limit)
		const skipClause = options.skip ? sql`OFFSET ${options.skip}` : sql``
		const joinClauses = this.buildJoinClause(options.joins)

		const query = sql`SELECT ${selectClause} FROM ${this.table} ${joinClauses} ${whereClause} ${sortClause} ${limitClause} ${skipClause}`
		return this.buildResultAlias<Right, Result>(this.db.all(query))
	}

	public findOne<Right extends Table, Result extends SelectResult<Left, Right>>(
		filter: QueryFilter<Left> = {},
		options: Omit<QueryOptions<Left, Right, Result>, 'limit'> = {},
	): ReturnResult<Left, Right, Result> | null {
		return this.find(filter, { ...options, limit: 1 })[0] ?? null
	}

	public findOneAndUpdate<Right extends Table, Result extends SelectResult<Left, Right>>(
		filter: QueryFilter<Left>,
		data: Partial<Omit<Insert, 'id'>>,
		options: Omit<QueryOptions<Left, Right, Result>, 'limit'> & { upsert?: boolean } = {},
	): ReturnResult<Left, Right, Result> | null {
		const record = this.findOne(filter, { ...options, select: undefined })
		if (record) {
			return this.update({ ...record, ...data } as object as Select, options)[0]
		} else if (options.upsert) {
			// @ts-expect-error
			return this.insert({ ...filter, ...data } as Insert, options)[0]
		}
		return null
	}

	public findOneAndDelete<Right extends Table, Result extends SelectResult<Left, Right>>(
		filter: QueryFilter<Left> = {},
		options: Omit<QueryOptions<Left, Right, Result>, 'limit'> = {},
	): ReturnResult<Left, Right, Result> | null {
		const record = this.findOne(filter, { ...options, select: undefined })
		return record ? this.delete(record as object as Select, options)[0] : null
	}

	public insert<Right extends Table, Result extends SelectResult<Left, Right>>(
		record: Omit<Insert, 'id'> | Omit<Insert, 'id'>[],
		options: Pick<QueryOptions<Left, Right, Result>, 'select'> = {},
	): Array<ReturnResult<Left, Right, Result>> {
		const records = (Array.isArray(record) ? record : [record]).filter((rec) => Object.keys(rec).length)
		if (!records.length) return []

		const values: Record<string, SQL>[] = records.map((rec) => {
			const { id, ...rest } = rec as Record<string, unknown>
			return Object.fromEntries(Object.entries(rest).map(([key, value]) => [key, sql`${value}`]))
		})

		const insertQuery = this.dialect.buildInsertQuery({ table: this.table, values })
		const selectClause = this.buildSelectClause(options.select)

		const query = sql`${insertQuery} RETURNING ${selectClause}`
		return this.buildResultAlias<Right, Result>(this.db.all(query))
	}

	public update<Right extends Table, Result extends SelectResult<Left, Right>>(
		record: Select,
		options: Pick<QueryOptions<Left, Right, Result>, 'limit' | 'sort' | 'select'> = {},
	): Array<ReturnResult<Left, Right, Result>> {
		const { id, ...set } = record
		const updateQuery = this.dialect.buildUpdateQuery({ table: this.table, set })
		const whereClause = this.buildWhereClause({ id: id! })
		const sortClause = this.buildSortClause(options.sort)
		const limitClause = this.buildLimitClause(options.limit)
		const selectClause = this.buildSelectClause(options.select)

		const query = sql`${updateQuery} ${whereClause} ${sortClause} ${limitClause} RETURNING ${selectClause}`
		return this.buildResultAlias<Right, Result>(this.db.all(query))
	}

	public delete<Right extends Table, Result extends SelectResult<Left, Right>>(
		record: Select,
		options: Pick<QueryOptions<Left, Right, Result>, 'limit' | 'sort' | 'select'> = {},
	): Array<ReturnResult<Left, Right, Result>> {
		const deleteQuery = this.dialect.buildDeleteQuery({ table: this.table })
		const whereClause = this.buildWhereClause({ id: record.id! })
		const sortClause = this.buildSortClause(options.sort)
		const limitClause = this.buildLimitClause(options.limit)
		const selectClause = this.buildSelectClause(options.select)

		const query = sql`${deleteQuery} ${whereClause} ${sortClause} ${limitClause} RETURNING ${selectClause}`
		return this.buildResultAlias<Right, Result>(this.db.all(query))
	}

	private buildWhereClause(filter: QueryFilter<Left>): SQL {
		const conditions = Object.entries(filter).flatMap(([column, value]) => {
			const tableColumn = this.table[column as keyof Left]
			const condition = isObjectLike(value) ? value : { $eq: value }
			return Object.entries(condition).flatMap(([operator, operand]) => {
				return operand == null
					? OperatorMap.$exists(tableColumn, operator === '$ne')
					: OperatorMap[operator as keyof QueryOperator](tableColumn, operand)
			})
		})
		return conditions.length ? sql`WHERE ${sql.join(conditions, sql.raw(' AND '))}` : sql``
	}

	public buildJoinClause<Right extends Table>(joins: JoinOptions<Left, Right>[] = []): SQL {
		const joinClauses = joins.map(({ type, table, on }) => {
			const onConditions = Object.entries(on).map(([leftKey, rightKey]) => {
				const leftColumn = this.table[leftKey as keyof Left]
				const rightColumn = table[rightKey as keyof Right]
				return sql`${leftColumn} = ${rightColumn}`
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
			return sql`${this.table[column as keyof Left]} ${sql.raw(String(direction ?? 'ASC'))}`
		})
		return sortings.length ? sql`ORDER BY ${sql.join(sortings, sql.raw(','))}` : sql``
	}

	private buildSelectClause<S, Right extends Table>(select?: S, joins?: JoinOptions<Left, Right>[]): SQL {
		const columns = Object.keys(select ?? {})
			.map((key) => {
				const col =
					key in this.table // is left table
						? this.table[key as keyof Left]
						: joins?.find(({ table }) => key in table)?.table[key as keyof Right]
				return col ? sql`${col}` : null
			})
			.filter(Boolean)
		return columns.length ? sql.join(columns as SQL[], sql.raw(',')) : sql`*`
	}

	private buildResultAlias<Right extends Table, Result extends SelectResult<Left, Right>>(
		results: Select[],
	): Array<ReturnResult<Left, Right, Result>> {
		return results.map((result) => {
			return Object.entries(result).reduce((acc, [key, value]) => {
				const camel = key.replace(/(_\w)/g, (matches) => matches[1].toUpperCase())
				return (acc[camel] = value), acc
			}, {} as Record<string, unknown>)
		}) as Array<ReturnResult<Left, Right, Result>>
	}

	private readonly dialect: SQLiteSyncDialect
}

type QueryOptions<Left extends Table, Right extends Table, Result> = {
	limit?: number
	skip?: number
	sort?: Partial<Record<keyof CombineResult<Left, Right>, 'ASC' | 'DESC'>>
	select?: Result
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

type QueryFilter<Left extends Table> = {
	[K in keyof InferSelect<Left>]?: InferSelect<Left>[K] | QueryOperator<InferSelect<Left>[K]>
}

interface JoinOptions<Left extends Table, Right extends Table> {
	table: Right
	on: JoinFilter<Left, Right>
	type?: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL'
}

type JoinFilter<Left extends Table, Right extends Table> = {
	[K in keyof InferSelect<Left>]?: keyof InferSelect<Right>
}

type SelectResult<Left extends Table, Right extends Table> = Partial<Record<keyof CombineResult<Left, Right>, 1>>

type ReturnResult<Left extends Table, Right extends Table | undefined, Result> = Right extends SQLiteTableWithColumns<infer _>
	? Result extends SelectResult<Left, Right>
		? Omit<CombineResult<Left, Right>, Exclude<keyof CombineResult<Left, Right>, keyof Result>>
		: CombineResult<Left, Right>
	: Omit<InferSelect<Left>, Exclude<keyof InferSelect<Left>, keyof Result>> | InferSelect<Left>

type CombineResult<Left extends Table, Right extends Table> = Right extends SQLiteTableWithColumns<infer _>
	? InferSelect<Left> & InferSelect<Right>
	: InferSelect<Left>

type InferSelect<T extends Table> = InferSelectModel<T>

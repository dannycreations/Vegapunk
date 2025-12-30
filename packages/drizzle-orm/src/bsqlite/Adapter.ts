import { Result } from '@vegapunk/utilities/result';
import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableName,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  like,
  lt,
  lte,
  ne,
  not,
  notInArray,
  notLike,
  or,
  sql,
} from 'drizzle-orm';

import type { InferInsertModel, InferSelectModel, SQL, Table } from 'drizzle-orm';
import type { BetterSQLite3Database, BetterSQLiteSession } from 'drizzle-orm/better-sqlite3';
import type {
  ExtractTables,
  InferColumn,
  InferSelect,
  JoinClause,
  PatchedDialect,
  QueryFilter,
  QueryOptions,
  ReturnAlias,
  SelectClause,
} from './types';

const JOIN_MAP = {
  left: 'leftJoin',
  right: 'rightJoin',
  full: 'fullJoin',
  inner: 'innerJoin',
} as const;

const OPERATOR_MAP: Record<string, (col: SQL, val: SQL) => SQL> = {
  $eq: eq,
  $ne: ne,
  $gt: gt,
  $gte: gte,
  $lt: lt,
  $lte: lte,
  $like: like,
  $nlike: notLike,
  $glob: (col, val) => sql`${col} GLOB ${val}`,
  $nglob: (col, val) => sql`${col} NOT GLOB ${val}`,
  $in: (col, val) => (Array.isArray(val) && val.length > 0 ? inArray(col, val) : sql`0`),
  $nin: (col, val) => (Array.isArray(val) && val.length > 0 ? notInArray(col, val) : sql`1`),
  $null: (col, val) => (val ? isNull(col) : isNotNull(col)),
};

export class Adapter<A extends Table, Select extends InferSelectModel<A>, Insert extends InferInsertModel<A>> {
  private static patchDialect(dialect: PatchedDialect): void {
    if (dialect.__patched) return;
    dialect.__patched = true;

    // Drizzle doesn't interpret below 0 as "no limit".
    // https://github.com/drizzle-team/drizzle-orm/blob/main/drizzle-orm/src/sqlite-core/dialect.ts#L269
    const buildLimit = dialect.buildLimit.bind(dialect);
    dialect.buildLimit = (limit: number) => (limit >= 0 ? buildLimit(limit) : sql` LIMIT -1`);
  }

  protected readonly table: A;
  protected readonly trace: boolean;
  protected readonly db: BetterSQLite3Database;
  protected readonly dialect: PatchedDialect;
  protected readonly session: BetterSQLiteSession<never, never>;

  public constructor(db: BetterSQLite3Database, table: A, trace: boolean = false) {
    const tableWithId = table as A & { id: { primary: boolean } };
    Result.assert('id' in tableWithId && tableWithId.id.primary, `Table "${getTableName(table)}" must have a primary key "id"`);

    this.db = db;
    this.table = table;
    this.trace = trace;
    // @ts-expect-error access internal drizzle
    this.dialect = this.db.dialect;
    // @ts-expect-error access internal drizzle
    this.session = this.db.session;

    Adapter.patchDialect(this.dialect);
  }

  public count(filter: QueryFilter<A> = {}): Result<number, Error> {
    return this.withTrace((trace) => {
      const query = this.db.select({ count: count() }).from(this.table);
      query.where(this.buildWhereClause(filter));

      trace.value = () => query.getSQL();
      return query.get()?.count ?? 0;
    });
  }

  public find<const J extends JoinClause<A, Array<Table>> = [], S extends SelectClause<A, ExtractTables<J>, S> = {}>(
    filter: QueryFilter<A> = {},
    options: QueryOptions<A, ExtractTables<J>, S, J> = {},
  ): Result<Array<ReturnAlias<A, ExtractTables<J>, S, J>>, Error> {
    return this.withTrace((trace) => {
      const columnCache = this.buildColumnCache(options.joins);
      const select = this.buildSelectClause(columnCache, options.select);
      const query = this.db.select(select).from(this.table);
      if (this.hasKeys(options.joins)) {
        for (const join of options.joins) {
          if (!this.hasKeys(join)) continue;

          const isCrossJoin = join.type === 'cross';
          Result.assert(isCrossJoin || (join.on && this.hasKeys(join.on)), `Join conditions (on) must be specified for join type "${join.type}"`);

          if (isCrossJoin) {
            query.crossJoin(join.table);
          } else {
            const conds = Object.entries(join.on as Record<string, string>).map(([leftKey, rightKey]) => {
              const leftCol = this.table[leftKey as keyof A];
              const rightCol = (join.table as unknown as Record<string, unknown>)[rightKey!];
              Result.assert(leftCol && rightCol, `Invalid join keys: ${leftKey}, ${rightKey}`);
              return sql`${leftCol} = ${rightCol as SQL}`;
            });

            const joinMethod = JOIN_MAP[join.type as keyof typeof JOIN_MAP] ?? 'innerJoin';
            query[joinMethod](join.table, sql`(${sql.join(conds, sql.raw(' AND '))})`);
          }
        }
      }

      query.where(this.buildWhereClause(filter));
      if (this.hasKeys(options.order)) {
        query.orderBy(this.buildOrderClause(columnCache, options.order));
      }

      if (typeof options.limit === 'number') {
        query.limit(options.limit);
      }

      if (typeof options.offset === 'number') {
        query.offset(options.offset);
      }

      trace.value = () => query.getSQL();
      return query.all() as unknown as Array<ReturnAlias<A, ExtractTables<J>, S, J>>;
    });
  }

  public findOne<const J extends JoinClause<A, Array<Table>> = [], S extends SelectClause<A, ExtractTables<J>, S> = {}>(
    filter: QueryFilter<A> = {},
    options: Omit<QueryOptions<A, ExtractTables<J>, S, J>, 'limit'> = {},
  ): Result<ReturnAlias<A, ExtractTables<J>, S, J> | null, Error> {
    const record = this.find(filter, { ...options, limit: 1 });
    return record.map((r) => r[0] ?? null);
  }

  public findOneAndUpdate<B extends Array<Table>, S extends SelectClause<A, B, S>>(
    filter: Partial<InferSelect<A>>,
    data: Partial<Omit<Insert, 'id'>>,
    options: Omit<QueryOptions<A, B, S, unknown>, 'limit' | 'joins'> & {
      upsert: true;
    },
  ): Result<ReturnAlias<A, B, S> | null, Error>;
  public findOneAndUpdate<B extends Array<Table>, S extends SelectClause<A, B, S>>(
    filter: QueryFilter<A>,
    data: Partial<Omit<Insert, 'id'>>,
    options?: Omit<QueryOptions<A, B, S, unknown>, 'limit' | 'joins'> & {
      upsert?: false;
    },
  ): Result<ReturnAlias<A, B, S> | null, Error>;
  public findOneAndUpdate<B extends Array<Table>, S extends SelectClause<A, B, S>>(
    filter: Partial<InferSelect<A>> | QueryFilter<A>,
    data: Partial<Omit<Insert, 'id'>>,
    options: Omit<QueryOptions<A, B, S, unknown>, 'limit' | 'joins'> & {
      upsert?: boolean;
    } = {},
  ): Result<ReturnAlias<A, B, S> | null, Error> {
    return this.db.transaction(
      () => {
        const record = this.findOne(filter, { ...options, select: undefined });
        return record.mapInto((r) => {
          if (options.upsert && r === null) {
            const isComplex =
              Object.keys(filter).some((k) => k.startsWith('$')) ||
              Object.values(filter).some((v) => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).some((k) => k.startsWith('$')));
            if (isComplex) return Result.err(new Error('Cannot use complex filter when upserting'));

            return this.insert({ ...filter, ...data } as Insert, options).map((s) => s[0] as ReturnAlias<A, B, S>);
          }

          if (r !== null) {
            return this.update({ ...r, ...data } as unknown as Select, options).map((s) => s[0] as ReturnAlias<A, B, S>);
          }

          return Result.ok(r);
        });
      },
      { behavior: 'immediate' },
    );
  }

  public findOneAndDelete<B extends Array<Table>, S extends SelectClause<A, B, S>>(
    filter: QueryFilter<A> = {},
    options: Omit<QueryOptions<A, B, S, unknown>, 'limit' | 'joins'> = {},
  ): Result<ReturnAlias<A, B, S> | null, Error> {
    return this.db.transaction(
      () => {
        const record = this.findOne(filter, { ...options, select: undefined });
        return record.mapInto((r) => {
          if (r === null) return Result.ok(r);
          return this.delete(r as unknown as Select, options).map((s) => s[0] as ReturnAlias<A, B, S>);
        });
      },
      { behavior: 'immediate' },
    );
  }

  public insert<B extends Array<Table>, S extends SelectClause<A, B, S>>(
    record: Omit<Insert, 'id'> | Array<Omit<Insert, 'id'>>,
    options: Pick<QueryOptions<A, B, S, unknown>, 'select'> & {
      conflict?:
        | {
            resolution: 'ignore';
            target: Array<keyof Omit<Insert, 'id'>>;
            set?: { [K in keyof Omit<Insert, 'id'>]?: Insert[K] | SQL<A> };
          }
        | {
            resolution: 'update' | 'merge';
            target: Array<keyof Omit<Insert, 'id'>>;
            set: { [K in keyof Omit<Insert, 'id'>]?: Insert[K] | SQL<A> };
          };
    } = {},
  ): Result<Array<ReturnAlias<A, B, S>>, Error> {
    return this.withTrace((trace) => {
      const input = Array.isArray(record) ? record : [record];
      const values: Insert[] = [];

      for (let i = 0; i < input.length; i++) {
        const rec = input[i];
        if (!this.hasKeys(rec)) continue;

        const { id, ...newRec } = rec as Record<string, unknown>;
        values.push(newRec as Insert);
      }

      if (values.length === 0) {
        return [];
      }

      const query = this.db.insert(this.table).values(values);
      query.returning(this.buildSelectClause(this.buildColumnCache(), options.select));

      const conflictOpt = options.conflict;
      if (this.hasKeys(conflictOpt)) {
        const target = conflictOpt.target.map((r) => {
          const col = this.table[r as keyof A];
          Result.assert(col, `Conflict target column "${String(r)}" not found in table "${getTableName(this.table)}"`);
          return col as unknown as SQL;
        });

        const rec = (this.hasKeys(conflictOpt.set) ? conflictOpt.set : values[0]) as Record<string, unknown>;

        if (conflictOpt.resolution === 'ignore') {
          query.onConflictDoNothing({ target });
        } else if (conflictOpt.resolution === 'update') {
          const { id, ...newRec } = rec as Record<string, unknown>;
          query.onConflictDoUpdate({ target, set: newRec as Insert });
        } else {
          const mergeSet: Record<string, unknown> = {};
          for (const key in rec) {
            if (key === 'id') continue;
            const val = rec[key];
            const col = this.table[key as keyof A];
            Result.assert(col, `Conflict set column "${key}" not found in table "${getTableName(this.table)}"`);
            mergeSet[key] = sql`COALESCE(${col}, ${sql`${val}`})`;
          }
          query.onConflictDoUpdate({ target, set: mergeSet as Insert });
        }
      }

      trace.value = () => query.getSQL();
      return query.all() as unknown as Array<ReturnAlias<A, B, S>>;
    });
  }

  public update<B extends Array<Table>, S extends SelectClause<A, B, S>>(
    record: Select,
    options: Pick<QueryOptions<A, B, S, unknown>, 'select'> = {},
  ): Result<Array<ReturnAlias<A, B, S>>, Error> {
    return this.withTrace((trace) => {
      Result.assert(record?.id != null, 'Missing required "id" for update operation');

      const query = this.db.update(this.table).set(record);
      query.where(this.buildWhereClause({ id: record.id }));
      query.returning(this.buildSelectClause(this.buildColumnCache(), options.select));

      trace.value = () => query.getSQL();
      return query.all() as unknown as Array<ReturnAlias<A, B, S>>;
    });
  }

  public delete<B extends Array<Table>, S extends SelectClause<A, B, S>>(
    record: Select,
    options: Pick<QueryOptions<A, B, S, unknown>, 'select'> = {},
  ): Result<Array<ReturnAlias<A, B, S>>, Error> {
    return this.withTrace((trace) => {
      Result.assert(record?.id != null, 'Missing required "id" for delete operation');

      const query = this.db.delete(this.table);
      query.where(this.buildWhereClause({ id: record.id }));
      query.returning(this.buildSelectClause(this.buildColumnCache(), options.select));

      trace.value = () => query.getSQL();
      return query.all() as unknown as Array<ReturnAlias<A, B, S>>;
    });
  }

  protected buildWhereClause(filter?: QueryFilter<A>): SQL {
    if (!filter || !this.hasKeys(filter)) {
      return undefined as unknown as SQL;
    }

    const conds = this.buildWhereLogical(filter);
    return conds.length === 0 ? (undefined as unknown as SQL) : and(...conds)!;
  }

  protected buildOrderClause<S>(columnCache: Record<string, unknown>, order?: S): SQL {
    if (!order || !this.hasKeys(order)) return undefined as unknown as SQL;

    const clauses: SQL[] = [];
    for (const key in order) {
      const direction = (order as Record<string, string>)[key];
      const column = columnCache[key] as SQL;
      if (column) {
        clauses.push(direction?.toLowerCase() === 'desc' ? desc(column) : asc(column));
      }
    }

    return clauses.length === 0 ? (undefined as unknown as SQL) : (sql.join(clauses, sql.raw(', ')) as unknown as SQL);
  }

  protected buildSelectClause<S>(columnCache: Record<string, unknown>, select?: S): InferColumn<A> {
    if (!select || !this.hasKeys(select)) return undefined as unknown as InferColumn<A>;

    const columns: Record<string, unknown> = {};
    let hasColumns = false;

    // Handle 'id' implicitly unless explicitly disabled
    const selectObj = select as unknown as Record<string, number>;
    if (selectObj['id'] !== 0) {
      const col = columnCache['id'];
      if (col) {
        columns['id'] = col;
        hasColumns = true;
      }
    }

    for (const key in selectObj) {
      if (key === 'id') continue;
      if (selectObj[key] === 0) continue;

      const column = columnCache[key];
      if (column) {
        columns[key] = column;
        hasColumns = true;
      }
    }

    return hasColumns ? (columns as InferColumn<A>) : (undefined as unknown as InferColumn<A>);
  }

  protected buildWhereLogical(filter: QueryFilter<A>): Array<SQL> {
    const result: Array<SQL> = [];

    for (const key in filter) {
      const value = filter[key as keyof typeof filter];

      if (key === '$and' || key === '$nand' || key === '$or' || key === '$nor') {
        if (!Array.isArray(value) || value.length === 0) {
          result.push(sql.raw(key === '$and' || key === '$nor' ? '1' : '0'));
          continue;
        }

        const nested: SQL[] = [];
        const values = value as QueryFilter<A>[];
        for (let i = 0; i < values.length; i++) {
          const sub = this.buildWhereLogical(values[i]);
          nested.push(...sub);
        }

        if (nested.length === 0) {
          result.push(sql.raw(key === '$and' || key === '$nor' ? '1' : '0'));
          continue;
        }

        const joined = key === '$and' || key === '$nand' ? and(...nested) : or(...nested);
        result.push(key === '$nand' || key === '$nor' ? not(joined!) : joined!);
      } else if (key === '$not') {
        let conds: SQL[];
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          conds = this.buildWhereLogical(value as QueryFilter<A>);
        } else {
          conds = this.buildWhereComparison(key, value);
        }
        result.push(conds.length === 0 ? sql`0` : not(and(...conds)!));
      } else {
        const conds = this.buildWhereComparison(key, value);
        result.push(...conds);
      }
    }

    return result;
  }

  protected buildWhereComparison(key: unknown, val: unknown): Array<SQL> {
    const column = this.table[key as keyof A] as unknown as SQL;
    if (!column) return [sql`0`];
    if (val === undefined) return [];

    if (val === null || typeof val !== 'object' || Array.isArray(val)) {
      if (val === null) return [isNull(column)];
      return [eq(column, val as SQL)];
    }

    const operation = val as Record<string, unknown>;
    const result: Array<SQL> = [];

    for (const operator in operation) {
      const operand = operation[operator];

      if (operator === '$not') {
        const negated = this.buildWhereComparison(key, operand);
        result.push(negated.length === 0 ? sql`0` : not(and(...negated)!));
        continue;
      }

      if (operand === null && operator !== '$eq' && operator !== '$ne' && operator !== '$null') {
        result.push(sql`0`);
        continue;
      }

      if (operator === '$eq' && operand === null) {
        result.push(isNull(column));
        continue;
      }

      if (operator === '$ne' && operand === null) {
        result.push(isNotNull(column));
        continue;
      }

      const handler = OPERATOR_MAP[operator];
      result.push(handler ? handler(column, operand as SQL) : sql`0`);
    }
    return result;
  }

  protected buildColumnCache<B extends Array<Table>>(joins?: JoinClause<A, B>): Record<string, unknown> {
    if (!joins || joins.length === 0) {
      return this.table as unknown as Record<string, unknown>;
    }

    const cache: Record<string, unknown> = {};
    for (let i = joins.length - 1; i >= 0; i--) {
      Object.assign(cache, joins[i].table as unknown as Record<string, unknown>);
    }
    Object.assign(cache, this.table as unknown as Record<string, unknown>);
    return cache;
  }

  protected hasKeys(obj?: object | null): obj is object {
    if (obj == null) return false;
    for (const _ in obj) return true;
    return false;
  }

  protected withTrace<T>(fn: (trace: { value?: () => SQL }) => T): Result<T, Error> {
    if (!this.trace) {
      return Result.from(() => fn({}));
    }

    const trace: { value?: () => SQL } = {};
    return Result.from(() => fn(trace)).mapErr((error) => {
      if (trace.value) {
        const query = this.dialect.sqlToQuery(trace.value());
        Object.assign(error as Error, { query });
      }
      return error as Error;
    });
  }
}

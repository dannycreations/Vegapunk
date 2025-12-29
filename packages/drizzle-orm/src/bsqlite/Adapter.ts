import { Result } from '@vegapunk/utilities/result';
import { count, getTableName, sql } from 'drizzle-orm';

import type { InferInsertModel, InferSelectModel, SQL, Table } from 'drizzle-orm';
import type { BetterSQLite3Database, BetterSQLiteSession } from 'drizzle-orm/better-sqlite3';
import type {
  ComparisonOperator,
  ExtractTables,
  InferColumn,
  InferSelect,
  JoinClause,
  LogicalOperator,
  PatchedDialect,
  QueryFilter,
  QueryOptions,
  ReturnAlias,
  SelectClause,
} from './types';

export class Adapter<A extends Table, Select extends InferSelectModel<A>, Insert extends InferInsertModel<A>> {
  private static patchDialect(dialect: PatchedDialect): void {
    if (!dialect.__patched) {
      // drizzle-orm/sqlite-core/dialect.js
      const buildLimit = dialect.buildLimit.bind(dialect);
      dialect.buildLimit = function (limit: number) {
        return limit === -1 ? sql` LIMIT ${limit}` : buildLimit(limit);
      };
      dialect.__patched = true;
    }
  }

  protected readonly table: A;
  protected readonly trace: boolean;
  protected readonly db: BetterSQLite3Database;
  protected readonly dialect: PatchedDialect;
  protected readonly session: BetterSQLiteSession<never, never>;

  public constructor(db: BetterSQLite3Database, table: A, trace: boolean = false) {
    // @ts-expect-error avoid casting type
    Result.assert('id' in table && table.id.primary, `Table "${getTableName(table)}" must have a primary key "id"`);

    this.db = db;
    this.table = table;
    this.trace = trace;
    // @ts-expect-error avoid casting type
    this.dialect = this.db.dialect;
    // @ts-expect-error avoid casting type
    this.session = this.db.session;

    Adapter.patchDialect(this.dialect);
  }

  public count(filter: QueryFilter<A> = {}): Result<number, Error> {
    let querySql: unknown | undefined;
    return Result.from(() => {
      const query = this.db.select({ count: count() }).from(this.table);
      query.where(this.buildWhereClause(filter));
      if (this.trace) {
        querySql = this.dialect.sqlToQuery(query.getSQL());
      }
      return query.get()?.count ?? 0;
    }).mapErr((error) => Object.assign(error as Error, querySql));
  }

  public find<const J extends JoinClause<A, Array<Table>> = [], S extends SelectClause<A, ExtractTables<J>, S> = {}>(
    filter: QueryFilter<A> = {},
    options: QueryOptions<A, ExtractTables<J>, S, J> = {},
  ): Result<Array<ReturnAlias<A, ExtractTables<J>, S, J>>, Error> {
    let querySql: unknown | undefined;
    return Result.from(() => {
      const select = this.buildSelectClause(options.select, options.joins);
      const query = this.db.select(select).from(this.table);
      if (this.hasKeys(options.joins)) {
        for (const join of options.joins) {
          if (!this.hasKeys(join)) {
            continue;
          }

          const isCrossJoin = join.type === 'cross';
          Result.assert(isCrossJoin || (join.on && this.hasKeys(join.on)), `Join conditions (on) must be specified for join type "${join.type}"`);

          let joinMethod: 'leftJoin' | 'rightJoin' | 'fullJoin' | 'innerJoin';
          switch (join.type) {
            case 'left':
              joinMethod = 'leftJoin';
              break;
            case 'right':
              joinMethod = 'rightJoin';
              break;
            case 'full':
              joinMethod = 'fullJoin';
              break;
            default:
              joinMethod = 'innerJoin';
          }

          if (isCrossJoin) {
            query.crossJoin(join.table);
          } else {
            const conds = Object.entries(join.on).map(([leftKey, rightKey]) => {
              const leftCol = this.table[leftKey as keyof A];
              const rightCol = (join.table as unknown as Record<string, unknown>)[rightKey!];
              Result.assert(leftCol && rightCol, `Invalid join keys: ${leftKey}, ${rightKey}`);
              return sql`${leftCol} = ${rightCol}`;
            });
            query[joinMethod](join.table, sql`(${sql.join(conds, sql.raw(' AND '))})`);
          }
        }
      }

      query.where(this.buildWhereClause(filter));
      if (this.hasKeys(options.order)) {
        query.orderBy(this.buildOrderClause(options.order, options.joins));
      }

      query.limit(typeof options.limit === 'number' && options.limit >= 0 ? options.limit : -1);
      query.offset(typeof options.offset === 'number' && options.offset >= 0 ? options.offset : 0);
      if (this.trace) {
        querySql = this.dialect.sqlToQuery(query.getSQL());
      }
      return query.all() as unknown as Array<ReturnAlias<A, ExtractTables<J>, S, J>>;
    }).mapErr((error) => Object.assign(error as Error, querySql));
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
    const record = this.findOne(filter, { ...options, select: undefined });
    return record.mapInto((r) => {
      if (options.upsert && r === null) {
        const isComplex =
          Object.keys(filter).some((key) => key.startsWith('$')) ||
          Object.values(filter).some(
            (val) => val !== null && typeof val === 'object' && !Array.isArray(val) && Object.keys(val).some((k) => k.startsWith('$')),
          );
        if (isComplex) {
          return Result.err(new Error('Cannot use comparison operators in filter when upserting'));
        }

        const inserted = this.insert({ ...filter, ...data } as Insert, options);
        return inserted.map((s) => s[0] as ReturnAlias<A, B, S>);
      } else if (r !== null) {
        const updated = this.update({ ...r, ...data } as unknown as Select, options);
        return updated.map((s) => s[0] as ReturnAlias<A, B, S>);
      }
      return Result.ok(r);
    });
  }

  public findOneAndDelete<B extends Array<Table>, S extends SelectClause<A, B, S>>(
    filter: QueryFilter<A> = {},
    options: Omit<QueryOptions<A, B, S, unknown>, 'limit' | 'joins'> = {},
  ): Result<ReturnAlias<A, B, S> | null, Error> {
    const record = this.findOne(filter, { ...options, select: undefined });
    return record.mapInto((r) => {
      if (r === null) {
        return Result.ok(r);
      }

      const deleted = this.delete(r as unknown as Select, options);
      return deleted.map((s) => s[0] as ReturnAlias<A, B, S>);
    });
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
    let querySql: unknown | undefined;
    return Result.from(() => {
      const records = (Array.isArray(record) ? record : [record]).filter(this.hasKeys);
      if (records.length === 0) {
        return [];
      }

      const values = records.map(({ id, ...rest }: Record<string, unknown>) => rest);
      const query = this.db.insert(this.table).values(values as Array<Insert>);
      query.returning(this.buildSelectClause(options.select));
      if (this.hasKeys(options.conflict)) {
        const { target, set, resolution } = options.conflict;
        const columns = target.map((r) => {
          const column = this.table[r as keyof A];
          Result.assert(column, `Conflict target column ${String(r)} does not exist in table`);
          return sql`${column}`;
        });

        const conflict = sql.join(columns, sql.raw(', '));
        const { id, ...rest } = this.hasKeys(set) ? set : values[0];

        if (resolution === 'ignore') {
          query.onConflictDoNothing({ target: conflict });
        } else if (resolution === 'update') {
          query.onConflictDoUpdate({ target: conflict, set: rest as Insert });
        } else {
          query.onConflictDoUpdate({
            target: conflict,
            set: Object.fromEntries(
              Object.entries(rest).map(([key, value]) => {
                const column = this.table[key as keyof A];
                Result.assert(column, `Conflict set column ${key} does not exist in table`);
                return [key, sql`COALESCE(${column}, ${sql`${value}`})`];
              }),
            ) as Record<string, SQL>,
          });
        }
      }
      if (this.trace) {
        querySql = this.dialect.sqlToQuery(query.getSQL());
      }
      return query.all() as unknown as Array<ReturnAlias<A, B, S>>;
    }).mapErr((error) => Object.assign(error as Error, querySql));
  }

  public update<B extends Array<Table>, S extends SelectClause<A, B, S>>(
    record: Select,
    options: Pick<QueryOptions<A, B, S, unknown>, 'select'> = {},
  ): Result<Array<ReturnAlias<A, B, S>>, Error> {
    let querySql: unknown | undefined;
    return Result.from(() => {
      Result.assert(record?.id != null, 'Missing required "id" for update operation');

      const query = this.db.update(this.table).set(record);
      query.where(this.buildWhereClause({ id: record.id }));
      query.returning(this.buildSelectClause(options.select));
      if (this.trace) {
        querySql = this.dialect.sqlToQuery(query.getSQL());
      }
      return query.all() as unknown as Array<ReturnAlias<A, B, S>>;
    }).mapErr((error) => Object.assign(error as Error, querySql));
  }

  public delete<B extends Array<Table>, S extends SelectClause<A, B, S>>(
    record: Select,
    options: Pick<QueryOptions<A, B, S, unknown>, 'select'> = {},
  ): Result<Array<ReturnAlias<A, B, S>>, Error> {
    let querySql: unknown | undefined;
    return Result.from(() => {
      Result.assert(record?.id != null, 'Missing required "id" for delete operation');

      const query = this.db.delete(this.table);
      query.where(this.buildWhereClause({ id: record.id }));
      query.returning(this.buildSelectClause(options.select));
      if (this.trace) {
        querySql = this.dialect.sqlToQuery(query.getSQL());
      }
      return query.all() as unknown as Array<ReturnAlias<A, B, S>>;
    }).mapErr((error) => Object.assign(error as Error, querySql));
  }

  protected buildWhereClause(filter?: QueryFilter<A>): SQL {
    if (!filter || !this.hasKeys(filter)) {
      return undefined as unknown as SQL;
    }

    const conds = this.processWhereLogical(filter);
    if (conds.length === 0) {
      return undefined as unknown as SQL;
    }
    return sql`(${sql.join(conds, sql.raw(' AND '))})`;
  }

  protected processWhereLogical(filter: QueryFilter<A>): Array<SQL> {
    return Object.entries(filter).flatMap(([key, value]) => {
      switch (key as keyof LogicalOperator<A>) {
        default:
          return this.processWhereComparison(key, value);
        case '$and':
          if (!Array.isArray(value)) {
            return sql`0`;
          }
          if (value.length === 0) {
            return sql`1`;
          }
          return sql`(${sql.join(value.flatMap(this.processWhereLogical.bind(this)), sql.raw(' AND '))})`;
        case '$nand':
          if (!Array.isArray(value)) {
            return sql`0`;
          }
          if (value.length === 0) {
            return sql`0`;
          }
          return sql`NOT (${sql.join(value.flatMap(this.processWhereLogical.bind(this)), sql.raw(' AND '))})`;
        case '$or':
          if (!Array.isArray(value)) {
            return sql`0`;
          }
          if (value.length === 0) {
            return sql`0`;
          }
          return sql`(${sql.join(value.flatMap(this.processWhereLogical.bind(this)), sql.raw(' OR '))})`;
        case '$nor':
          if (!Array.isArray(value)) {
            return sql`0`;
          }
          if (value.length === 0) {
            return sql`1`;
          }
          return sql`NOT (${sql.join(value.flatMap(this.processWhereLogical.bind(this)), sql.raw(' OR '))})`;
        case '$not':
          let conds: Array<SQL>;
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            conds = this.processWhereLogical(value);
          } else {
            conds = this.processWhereComparison(key, value);
          }
          if (conds.length === 0) {
            return sql`0`;
          }
          return sql`NOT (${sql.join(conds, sql.raw(' AND '))})`;
      }
    });
  }

  protected processWhereComparison(key: unknown, val: unknown): Array<SQL> {
    const column = this.table[key as keyof A];
    if (!column) {
      return [sql`0`];
    }
    if (val === undefined) {
      return [];
    }

    const operation = val && typeof val === 'object' && !Array.isArray(val) ? val : { $eq: val };
    return Object.entries(operation).map(([operator, operand]) => {
      switch (operator as keyof ComparisonOperator<A>) {
        default:
          return sql`0`;
        case '$eq':
          if (operand === null) {
            return sql`${column} IS NULL`;
          }
          return sql`${column} = ${sql`${operand}`}`;
        case '$ne':
          if (operand === null) {
            return sql`${column} IS NOT NULL`;
          }
          return sql`${column} <> ${sql`${operand}`}`;
        case '$gt':
          if (operand === null) {
            return sql`0`;
          }
          return sql`${column} > ${sql`${operand}`}`;
        case '$gte':
          if (operand === null) {
            return sql`0`;
          }
          return sql`${column} >= ${sql`${operand}`}`;
        case '$lt':
          if (operand === null) {
            return sql`0`;
          }
          return sql`${column} < ${sql`${operand}`}`;
        case '$lte':
          if (operand === null) {
            return sql`0`;
          }
          return sql`${column} <= ${sql`${operand}`}`;
        case '$like':
          if (operand === null) {
            return sql`0`;
          }
          return sql`${column} LIKE ${sql`${operand}`}`;
        case '$nlike':
          if (operand === null) {
            return sql`0`;
          }
          return sql`${column} NOT LIKE ${sql`${operand}`}`;
        case '$glob':
          if (operand === null) {
            return sql`0`;
          }
          return sql`${column} GLOB ${sql`${operand}`}`;
        case '$nglob':
          if (operand === null) {
            return sql`0`;
          }
          return sql`${column} NOT GLOB ${sql`${operand}`}`;
        case '$in':
          if (!Array.isArray(operand) || operand.length === 0) {
            return sql`0`;
          }
          return sql`${column} IN (${sql.join(operand, sql.raw(', '))})`;
        case '$nin':
          if (!Array.isArray(operand) || operand.length === 0) {
            return sql`1`;
          }
          return sql`${column} NOT IN (${sql.join(operand, sql.raw(', '))})`;
        case '$null':
          return operand ? sql`${column} IS NULL` : sql`${column} IS NOT NULL`;
        case '$not':
          const negated = this.processWhereComparison(key, operand);
          if (negated.length === 0) {
            return sql`0`;
          }
          return sql`NOT (${sql.join(negated, sql.raw(' AND '))})`;
      }
    });
  }

  protected buildOrderClause<S, B extends Array<Table>>(order?: S, joins?: JoinClause<A, B>): SQL {
    if (!order || !this.hasKeys(order)) {
      return undefined as unknown as SQL;
    }

    const clauses = Object.entries(order)
      .map(([key, direction]) => {
        let column: unknown = this.table[key as keyof A];
        if (!column && joins?.length) {
          const join = joins.find((r) => key in r.table);
          column = (join?.table as unknown as Record<string, unknown>)[key];
        }
        if (!column) {
          return null;
        }

        const dirStr = String(direction || 'ASC').toUpperCase();
        return sql`${column} ${sql.raw(dirStr)}`;
      })
      .filter((r) => r !== null);
    if (clauses.length === 0) {
      return undefined as unknown as SQL;
    }
    return sql.join(clauses, sql.raw(', '));
  }

  protected buildSelectClause<S, B extends Array<Table>>(select?: S, joins?: JoinClause<A, B>): InferColumn<A> {
    if (!select || !this.hasKeys(select)) {
      return undefined as unknown as InferColumn<A>;
    }

    const selection: Record<string, number> = { ...select };
    if (!('id' in selection)) {
      selection['id'] = 1;
    }

    const columns = Object.entries(selection)
      .map(([key, include]) => {
        if (include === 0) {
          return null;
        }

        let column: unknown = this.table[key as keyof A];
        if (!column && joins?.length) {
          const join = joins.find((r) => key in r.table);
          column = (join?.table as unknown as Record<string, unknown>)[key];
        }
        if (!column) {
          return null;
        }
        return [key, column];
      })
      .filter((r) => r !== null);
    if (columns.length === 0) {
      return undefined as unknown as InferColumn<A>;
    }
    return Object.fromEntries(columns);
  }

  protected hasKeys(obj?: object): obj is object {
    return !!obj && Object.keys(obj).length > 0;
  }
}

import { defaultsDeep } from '@vegapunk/utilities'
import Database from 'better-sqlite3'
import { BetterSQLite3Database, drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { Adapter } from './Adapter'

export * from 'drizzle-orm/better-sqlite3'
export * from 'drizzle-orm/sqlite-core'
export { Adapter, Database }

export type BSqliteOptions = {
	out: string
	schema: string | string[]
	dbCredentials: { url: string }
	logger?: boolean
	breakpoints?: boolean
	tablesFilter?: string | string[]
	extensionsFilters?: string[]
	schemaFilter?: string | string[]
	verbose?: boolean
	strict?: boolean
	casing?: 'camelCase' | 'snake_case'
	migrations?: {
		table?: string
		schema?: string
		prefix?: 'index' | 'timestamp' | 'supabase' | 'unix' | 'none'
	}
	introspect?: {
		casing: 'camel' | 'preserve'
	}
}

const baseOptions = {
	dialect: 'sqlite',
	casing: 'snake_case',
	out: 'src/lib/database/migrations/',
	schema: 'src/lib/database/schema.ts',
	dbCredentials: { url: 'sessions/bsqlite.db' },
} satisfies BSqliteOptions & { dialect: string }

export function start(options: BSqliteOptions): BetterSQLite3Database {
	const client = new Database(options.dbCredentials.url)
	const db = drizzle(client, { casing: options.casing, logger: options.logger })

	migrate(db, { migrationsFolder: options.out })
	return db
}

export function config(options: Partial<BSqliteOptions> = {}): BSqliteOptions {
	return defaultsDeep({}, options, baseOptions)
}

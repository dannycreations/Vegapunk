import { defaultsDeep } from '@vegapunk/utilities'
import Database from 'better-sqlite3'
import { Config, defineConfig } from 'drizzle-kit'
import { BetterSQLite3Database, drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { Adapter } from './Adapter'

export * from 'drizzle-orm/sqlite-core'
export { Adapter, Database }

export type BSqliteOptions = {
	dialect: 'sqlite'
	out: string
	dbCredentials: { url: string }
} & Config

const baseOptions = {
	dialect: 'sqlite',
	casing: 'snake_case',
	out: 'src/lib/database/migrations/',
	schema: 'src/lib/database/DrizzleClient.ts',
	dbCredentials: { url: 'sessions/bsqlite.db' },
} satisfies BSqliteOptions

export function start(options: BSqliteOptions): { db: BetterSQLite3Database } {
	const client = new Database(options.dbCredentials.url)
	const db = drizzle(client, { casing: options.casing })

	migrate(db, { migrationsFolder: options.out })

	return { db }
}

export function config(options: Partial<BSqliteOptions> = {}): BSqliteOptions {
	return defineConfig(defaultsDeep({}, options, baseOptions)) as BSqliteOptions
}

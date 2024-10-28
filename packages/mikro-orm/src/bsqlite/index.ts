import { BetterSqliteDriver, defineConfig } from '@mikro-orm/better-sqlite'
import { EntityManager, MikroORM, Options } from '@mikro-orm/core'
import { TsMorphMetadataProvider } from '@mikro-orm/reflection'
import { SqlHighlighter } from '@mikro-orm/sql-highlighter'
import { defaultsDeep } from '@vegapunk/utilities'

export * from '@mikro-orm/better-sqlite'

export type BSqliteOptions = {
	driver: typeof BetterSqliteDriver
} & Options<BetterSqliteDriver>

const baseOptions = {
	driver: BetterSqliteDriver,
	dbName: 'sessions/bsqlite.db',
	entities: ['dist/lib/entities'],
	highlighter: new SqlHighlighter(),
	metadataProvider: TsMorphMetadataProvider,
	allowGlobalContext: true,
} satisfies BSqliteOptions

export async function start(options: BSqliteOptions): Promise<{ db: MikroORM; em: EntityManager }> {
	const db = await MikroORM.init(options)

	const generator = db.getSchemaGenerator()
	if (process.env.NODE_ENV === 'development') {
		await generator.dropSchema()
		await generator.createSchema()
	} else {
		await generator.ensureDatabase()
		await generator.updateSchema()
	}
	return { db, em: db.em }
}

export function config(options: Partial<BSqliteOptions> = {}): BSqliteOptions {
	return defineConfig(defaultsDeep({}, options, baseOptions)) as BSqliteOptions
}

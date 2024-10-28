import { BetterSqliteDriver } from '@mikro-orm/better-sqlite'
import { MikroORM, Options } from '@mikro-orm/core'
import { TsMorphMetadataProvider } from '@mikro-orm/reflection'
import { SqlHighlighter } from '@mikro-orm/sql-highlighter'
import { defaultsDeep } from '@vegapunk/utilities'

export * from '@mikro-orm/better-sqlite'

export type BSqliteOptions = Omit<Options<BetterSqliteDriver>, 'driver'>

const baseOptions = {
	driver: BetterSqliteDriver,
	dbName: 'sessions/bsqlite.db',
	entities: ['dist/lib/entities'],
	highlighter: new SqlHighlighter(),
	metadataProvider: TsMorphMetadataProvider,
	allowGlobalContext: true,
} satisfies BSqliteOptions & { driver: unknown }

export async function start(options: BSqliteOptions): Promise<MikroORM> {
	const db = await MikroORM.init(options)

	const generator = db.getSchemaGenerator()
	if (process.env.NODE_ENV === 'development') {
		await generator.dropSchema()
		await generator.createSchema()
	} else {
		await generator.ensureDatabase()
		await generator.updateSchema()
	}
	return db
}

export function config(options: Partial<BSqliteOptions> = {}): BSqliteOptions {
	return defaultsDeep({}, options, baseOptions)
}

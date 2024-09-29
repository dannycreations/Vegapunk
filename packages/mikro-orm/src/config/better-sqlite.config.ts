import { BetterSqliteDriver, type Options } from '@mikro-orm/better-sqlite'
import { TsMorphMetadataProvider } from '@mikro-orm/reflection'
import { SqlHighlighter } from '@mikro-orm/sql-highlighter'
import { join } from 'node:path'

export * from '@mikro-orm/better-sqlite'

export function config(options: Options = {}): Options {
	return {
		driver: BetterSqliteDriver,
		dbName: 'sessions/bsqlite.db',
		entities: [join(process.cwd(), 'dist/lib/entities')],
		highlighter: new SqlHighlighter(),
		metadataProvider: TsMorphMetadataProvider,
		allowGlobalContext: true,
		...options,
	}
}

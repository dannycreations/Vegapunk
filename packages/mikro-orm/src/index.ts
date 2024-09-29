import { type EntityManager, type Options, MikroORM as _orm } from '@mikro-orm/core'
import { container } from '@vegapunk/core'

export * from '@mikro-orm/core'
export * as BetterSqlite from './config/better-sqlite.config'

export async function MikroORM(options: Options) {
	container.orm = await _orm.init(options)
	container.em = container.orm.em

	const generator = container.orm.getSchemaGenerator()
	if (process.env.NODE_ENV === 'development') {
		await generator.dropSchema()
		await generator.createSchema()
	} else {
		await generator.ensureDatabase()
		await generator.updateSchema()
	}

	container.logger?.info('MikroORM successfully connected.')
}

declare module '@sapphire/pieces' {
	interface Container {
		orm: _orm
		em: EntityManager
	}
}

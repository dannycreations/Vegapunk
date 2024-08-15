import { EntityManager, Options, MikroORM as _orm } from '@mikro-orm/core'
import { container } from '@vegapunk/core'

export * from './config/better-sqlite.config'

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

	if (container.logger) {
		container.logger.info('MikroORM successfully connected.')
	}
}

declare module '@vegapunk/core' {
	interface Container {
		orm: _orm
		em: EntityManager
	}
}

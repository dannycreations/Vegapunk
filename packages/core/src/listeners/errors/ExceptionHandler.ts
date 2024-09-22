import { container } from '@sapphire/pieces'
import { Listener } from '../../lib/structures/Listener'

export class ExceptionListener extends Listener {
	public constructor(context: Listener.LoaderContext) {
		super(context, {
			emitter: process,
			event: 'uncaughtException',
			enabled: container.client.options.errorExceptionHandler,
		})
	}

	public run(error: unknown) {
		this.container.logger.fatal(error, `Encountered error on event "${this.event.toString()}"`)
	}
}

void container.stores.loadPiece({
	store: 'listeners',
	name: 'ExceptionHandler',
	piece: ExceptionListener,
})

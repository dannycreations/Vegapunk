import { container } from '@sapphire/pieces'
import { Listener } from '../../lib/structures/Listener'

export class RejectionListener extends Listener {
	public constructor(context: Listener.LoaderContext) {
		super(context, {
			emitter: process,
			event: 'unhandledRejection',
			enabled: container.client.options.errorRejectionHandler,
		})
	}

	public run(error: unknown) {
		this.container.logger.fatal(error, `Encountered error on event "${this.event.toString()}"`)
	}
}

void container.stores.loadPiece({
	store: 'listeners',
	name: 'RejectionHandler',
	piece: RejectionListener,
})

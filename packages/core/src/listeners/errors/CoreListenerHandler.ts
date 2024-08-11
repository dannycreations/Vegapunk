import { container, Piece } from '@sapphire/pieces'
import { Listener } from '../../lib/structures/Listener'
import { Events } from '../../lib/types/Enum'

export class CoreListener extends Listener {
	public constructor(context: Listener.LoaderContext) {
		super(context, {
			event: Events.ListenerError,
			enabled: container.client.options.errorCoreHandler,
		})
	}

	public run(error: unknown, context: Piece) {
		this.container.logger.error(error, `Encountered error on event ${context.name}`)
	}
}

void container.stores.loadPiece({
	store: 'listeners',
	name: 'CoreListenerHandler',
	piece: CoreListener,
})

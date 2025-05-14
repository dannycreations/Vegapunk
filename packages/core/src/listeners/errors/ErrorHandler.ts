import { container, type Piece } from '@sapphire/pieces'
import { Listener } from '../../lib/structures/Listener'

export class CoreListener extends Listener<'internalError'> {
  public constructor(context: Listener.LoaderContext) {
    super(context, {
      event: 'internalError',
      enabled: container.client.options.internalError,
    })
  }

  public run(error: unknown, context: Piece): void {
    this.container.logger.error(error, `Encountered error on event "${context.name}"`)
  }
}

void container.stores.loadPiece({
  store: 'listeners',
  name: 'InternalError',
  piece: CoreListener,
})

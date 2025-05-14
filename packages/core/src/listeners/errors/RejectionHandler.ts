import { container } from '@sapphire/pieces'
import { Listener } from '../../lib/structures/Listener'

export class CoreListener extends Listener<'internalRejection'> {
  public constructor(context: Listener.LoaderContext) {
    super(context, {
      event: 'internalRejection',
      enabled: container.client.options.internalRejection,
    })
  }

  public run(reason: string, stack: Promise<unknown>): void {
    const error = Object.assign(new Error(reason), { stack })
    this.container.logger.fatal(error, `Encountered error on event "${this.event.toString()}"`)
  }
}

void container.stores.loadPiece({
  store: 'listeners',
  name: 'InternalRejection',
  piece: CoreListener,
})

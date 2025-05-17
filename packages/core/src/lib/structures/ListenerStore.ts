import { StoreBase } from './internal/StoreBase'
import { Listener } from './Listener'
import { ListenerLoaderStrategy } from './ListenerLoaderStrategy'

export class ListenerStore extends StoreBase<Listener, 'listeners'> {
  public constructor() {
    super(Listener, {
      name: 'listeners',
      strategy: new ListenerLoaderStrategy(),
    })
  }
}

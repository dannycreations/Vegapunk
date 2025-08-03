import { LoaderStrategy } from '@sapphire/pieces';

import type { Task } from './Task';
import type { TaskStore } from './TaskStore';

export class TaskLoaderStrategy extends LoaderStrategy<Task> {
  public override onLoad(_store: TaskStore, piece: Task): void {
    piece.startTask(true);

    // because startTask force enabled to true
    // this fix 'options.enabled = false' problem
    piece.enabled = piece.options.enabled ?? true;
  }

  public override onUnload(_store: TaskStore, piece: Task): void {
    piece.stopTask();
  }
}

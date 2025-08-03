import { StoreBase } from './internal/StoreBase';
import { Task } from './Task';
import { TaskLoaderStrategy } from './TaskLoaderStrategy';

export class TaskStore extends StoreBase<Task, 'tasks'> {
  public constructor() {
    super(Task, {
      name: 'tasks',
      strategy: new TaskLoaderStrategy(),
    });
  }
}

import { randomUUID } from 'node:crypto';
import { container } from '@sapphire/pieces';

import { HookPath } from './internal/StoreBase';
import { TaskBase } from './internal/TaskBase';
import { TaskStore } from './TaskStore';

import type { Piece } from '@sapphire/pieces';

export abstract class Task<Options extends Task.Options = Task.Options> extends TaskBase<Options> {
  public static readonly MIN_DELAY: number = 20;
  public static readonly MAX_DELAY: number = 2147483647;

  public static async createTask(task: CreateTask): Promise<Task> {
    task = { ...task, options: { ...task.options } };

    let taskStores = container.stores.get('tasks');
    if (!taskStores) {
      container.stores.register(new TaskStore());
      taskStores = container.stores.get('tasks');
    }

    const name = randomUUID();
    const context = { name, root: HookPath, path: HookPath, store: taskStores };
    const piece = Object.assign(new TaskBase(context, task.options), task);

    const previous = taskStores.get(piece.name);
    if (previous) {
      await previous.unload();
    }

    taskStores.strategy.onLoad(taskStores, piece);
    taskStores.set(piece.name, piece);
    return piece;
  }

  public abstract override update(): unknown;
}

export interface CreateTask {
  readonly awake?: () => unknown;
  readonly start?: () => unknown;
  readonly update: () => unknown;
  readonly options?: Task.Options;
}

export interface TaskOptions extends Piece.Options {
  readonly delay?: number;
  readonly ref?: boolean;
}

export namespace Task {
  export type Options = TaskOptions;
  export type LoaderContext = Piece.LoaderContext<'tasks'>;
}

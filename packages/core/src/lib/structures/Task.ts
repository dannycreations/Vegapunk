import { VirtualPath, type Piece } from '@sapphire/pieces'
import { TaskBase } from './TaskBase'

export abstract class Task<Options extends Task.Options = Task.Options> extends TaskBase<Options> {
	public static createTask(initTask: Function, runTask: Function, options: Task.Options) {
		if (typeof options.name === 'string') {
			Object.assign(options, { name: options.name.toUpperCase() })
		}

		const id = `${VirtualPath}${Date.now()}`
		const context = { root: id, path: id, name: id, store: null }
		const task = new TaskBase(context, options)

		if (typeof initTask === 'function') task['runOnInit'] = initTask.bind(initTask)
		if (typeof runTask === 'function') task['run'] = runTask.bind(runTask)
		task.setDelay(options.delay)

		task['_run'](true).then(() => task['_loop']())
		return task as Task
	}

	public constructor(context: Task.LoaderContext, options: Options = {} as Options) {
		super(context, { ...options, name: options.name ?? context.name })

		this.setDelay(options.delay)
	}

	public runOnInit?(): unknown
	public abstract run(...args: unknown[]): unknown
}

export interface TaskOptions extends Piece.Options {
	readonly delay: number
}

export namespace Task {
	export type Options = TaskOptions
	export type LoaderContext = Piece.LoaderContext<'tasks'>
}

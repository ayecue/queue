import EventEmitter from 'events';

import Queue from './queue';

const { v4: uuidv4 } = require('uuid');

export enum TaskState {
  Pending,
  Canceled,
  Running,
  Fulfilled,
  Failed
}

export type TaskCallback = (queue: Queue, task: Task) => any;
export type TaskErrorCallback = (err: Error) => void;

export interface TaskOptions {
  callback: TaskCallback;
}

export default class Task extends EventEmitter {
  readonly id: string;

  private state: TaskState;
  private callback: TaskCallback;

  constructor(options: TaskOptions) {
    super();
    this.id = uuidv4();
    this.state = TaskState.Pending;
    this.callback = options.callback;
  }

  async run(queue: Queue) {
    try {
      this.state = TaskState.Running;
      this.emit('start', this);
      const result = await this.callback(queue, this);
      this.state = TaskState.Fulfilled;
      this.emit('done', this, result);
    } catch (err) {
      this.state = TaskState.Failed;
      this.emit('error', this, err);
    }
  }

  cancel() {
    if (this.state !== TaskState.Pending && this.state !== TaskState.Running) {
      throw new Error('Cannot cancel non pending or non running task.');
    }

    this.state = TaskState.Canceled;
  }

  getState(): TaskState {
    return this.state;
  }
}

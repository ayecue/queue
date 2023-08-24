import EventEmitter from 'events';

const { v4: uuidv4 } = require('uuid');

export enum TaskState {
  Pending,
  Canceled,
  Running,
  Fulfilled,
  Failed
}

export type TaskCallback = (task: Task) => Promise<any>;
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

  async run(): Promise<void> {
    try {
      if (this.state !== TaskState.Pending) {
        throw new Error('Cannot only run pending task.');
      }

      this.state = TaskState.Running;
      this.emit('start', this);

      const payload = await this.callback(this);

      if (this.state !== TaskState.Running) {
        throw new Error(
          'Cannot only return result when state was not canceled.'
        );
      }

      this.state = TaskState.Fulfilled;
      this.emit('done', this, payload);
    } catch (err) {
      if (this.state !== TaskState.Failed) {
        this.state = TaskState.Failed;
        this.emit('error', this, err);
      }
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

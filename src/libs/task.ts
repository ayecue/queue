import EventEmitter from "events";

const { v4: uuidv4 } = require('uuid');

export enum TaskState {
  Pending,
  Canceled,
  Running,
  Fulfilled,
  Failed
}

export type TaskCallback = () => Promise<any>;
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

  async run() {
    try {
      this.state = TaskState.Running;
      const result = await this.callback();
      this.state = TaskState.Fulfilled;
      this.emit('done', this, result);
    } catch (err) {
      this.state = TaskState.Failed;
      this.emit('error', err);
    }
  }

  cancel() {
    if (this.state !== TaskState.Pending) {
      throw new Error('Cannot cancel non pending task.');
    }

    this.state = TaskState.Canceled;
  }

  getState(): TaskState {
    return this.state;
  }
}

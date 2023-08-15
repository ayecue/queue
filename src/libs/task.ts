const { v4: uuidv4 } = require('uuid');

export enum TaskState {
  Pending,
  Canceled,
  Running,
  Fulfilled,
  Failed
}

export type TaskCallback = () => Promise<void>;
export type TaskErrorCallback = (err: Error) => void;

export interface TaskOptions {
  callback: TaskCallback;
  onError?: TaskErrorCallback;
}

export default class Task {
  readonly id: string;

  private state: TaskState;
  private callback: TaskCallback;
  private onError: TaskErrorCallback;

  constructor(options: TaskOptions) {
    this.id = uuidv4();
    this.state = TaskState.Pending;
    this.callback = options.callback;
    this.onError =
      options.onError ??
      ((err) => {
        throw err;
      });
  }

  async run() {
    try {
      this.state = TaskState.Running;
      await this.callback();
      this.state = TaskState.Fulfilled;
    } catch (err) {
      this.state = TaskState.Failed;
      this.onError(err);
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

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

  private transitionToState(state: TaskState) {
    switch (state) {
      case TaskState.Running: {
        if (this.state !== TaskState.Pending) {
          throw new Error(
            `Cannot transition task to ${state} when not pending.`
          );
        }
        break;
      }
      case TaskState.Canceled:
        if (this.state === TaskState.Canceled) {
          throw new Error(
            `Cannot transition task to ${state} that has already been canceled.`
          );
        }
      case TaskState.Fulfilled:
      case TaskState.Failed: {
        if (this.state === TaskState.Fulfilled) {
          throw new Error(
            `Cannot transition task to ${state} that has already been fulfilled.`
          );
        }
        if (this.state === TaskState.Failed) {
          throw new Error(
            `Cannot transition task to ${state} that has already failed.`
          );
        }
        break;
      }
    }

    this.state = state;
  }

  async run(): Promise<void> {
    try {
      this.transitionToState(TaskState.Running);
      this.emit('start', this);

      const payload = await this.callback(this);

      if (this.state === TaskState.Canceled) {
        this.transitionToState(TaskState.Fulfilled);
        this.emit('done', this, null);
        return;
      }

      this.transitionToState(TaskState.Fulfilled);
      this.emit('done', this, payload);
    } catch (err) {
      this.transitionToState(TaskState.Failed);
      this.emit('error', this, err);
    }
  }

  cancel() {
    this.transitionToState(TaskState.Canceled);
  }

  getState(): TaskState {
    return this.state;
  }
}

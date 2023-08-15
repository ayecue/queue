import EventEmitter from 'events';

import Task, { TaskOptions, TaskState } from './task';

export enum QueueState {
  Idle,
  Running,
  Paused
}

export interface QueueOptions {
  concurrent?: number;
}

export default class Queue extends EventEmitter {
  readonly concurrent: number;

  private pending: Task[];
  private active: Map<string, Task>;
  private state: QueueState;

  constructor(options: QueueOptions = {}) {
    super();
    this.concurrent = options.concurrent ?? 3;
    this.pending = [];
    this.active = new Map();
    this.state = QueueState.Idle;
  }

  private async next() {
    if (this.state === QueueState.Paused) return;
    if (this.pending.length === 0) {
      if (this.active.size === 0 && this.state === QueueState.Running) {
        this.state = QueueState.Idle;
        this.emit('idle', this);
      }
      return;
    }
    if (this.active.size >= this.concurrent) return;

    const task = this.pending.shift();

    try {
      if (task.getState() !== TaskState.Canceled) {
        this.state = QueueState.Running;
        this.active.set(task.id, task);
        this.emit('start-task', this);
        await task.run();
      }
    } catch (err) {
      throw err;
    } finally {
      this.active.delete(task.id);
      this.emit('end-task', this);
      setImmediate(() => this.next());
    }
  }

  getState(): QueueState {
    return this.state;
  }

  pause(): Queue {
    this.state = QueueState.Paused;
    return this;
  }

  unpause(): Queue {
    this.state = QueueState.Idle;
    this.next();
    return this;
  }

  enqueue(options: TaskOptions): Task {
    const task = new Task(options);
    this.pending.push(task);
    this.next();
    return task;
  }

  dequeue(): Task {
    return this.pending.pop();
  }

  clear(): Queue {
    this.pending = [];
    return this;
  }
}

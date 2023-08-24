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
        this.emit('start-task', this, task);
        await task.run();
      }
    } catch (err) {
      this.emit('error', err);
    } finally {
      this.active.delete(task.id);
      this.emit('end-task', this, task);
      setImmediate(() => this.next());
    }
  }

  getRunning(): number {
    return this.active.size;
  }

  getRemaining(): number {
    return this.pending.length;
  }

  getState(): QueueState {
    return this.state;
  }

  drain(until: number): Promise<void> {
    if (until > this.concurrent) {
      throw new Error(
        `The until value cannot be higher than the concurrent value.`
      );
    }

    return new Promise((resolve) => {
      const check = () => {
        if (this.active.size === until) {
          this.unpause();
          resolve();
          return;
        }

        setImmediate(check);
      };

      this.pause();
      check();
    });
  }

  pause(): Queue {
    this.state = QueueState.Paused;
    return this;
  }

  unpause(): Queue {
    this.state = QueueState.Idle;
    setImmediate(() => this.next());
    return this;
  }

  enqueue(callback: TaskOptions['callback']): Task {
    const task = new Task({ callback });
    this.pending.push(task);
    this.emit('new-task', task);
    setImmediate(() => this.next());
    return task;
  }

  dequeue(): Task {
    return this.pending.pop();
  }

  clear(gracefully: boolean = false): Queue {
    const pending = this.pending;

    this.pending = [];

    if (gracefully) {
      Array.from(this.active.values()).forEach((item) => item.cancel());
      pending.forEach((item) => item.cancel());
      this.drain(0);
    }

    this.active = new Map();

    return this;
  }
}

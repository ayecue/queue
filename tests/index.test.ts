import { Queue } from '../src/index';
import { wait } from './utils';

describe('node-task-queue', function () {
  let testCallback;

  beforeEach(() => {
    testCallback = jest.fn();
  });

  describe('default', () => {
    test('normal queue with 1 concurrent', function (done) {
      const queue = new Queue({ concurrent: 1 });

      queue.enqueue({
        callback: async () => {
          await wait(500);
          testCallback(1);
        }
      });

      queue.enqueue({
        callback: async () => {
          await wait(500);
          testCallback(2);
        }
      });

      queue.enqueue({
        callback: async () => {
          await wait(500);
          testCallback(3);
        }
      });

      queue.on('idle', () => {
        expect(testCallback.mock.calls).toMatchSnapshot();
        done();
      });
    });

    test('normal queue with 2 concurrent', function (done) {
      const queue = new Queue({ concurrent: 2 });

      queue.enqueue({
        callback: async () => {
          await wait(500);
          testCallback(1);
        }
      });

      queue.enqueue({
        callback: async () => {
          await wait(500);
          testCallback(3);
        }
      });

      queue.enqueue({
        callback: async () => {
          await wait(500);
          testCallback(2);
        }
      });

      queue.on('idle', () => {
        expect(testCallback.mock.calls).toMatchSnapshot();
        done();
      });
    });

    test('normal queue with pause', function (done) {
      const queue = new Queue({ concurrent: 1 });

      queue.enqueue({
        callback: async () => {
          await wait(500);
          testCallback(1);
          queue.pause();
          wait(500).then(() => queue.unpause());
        }
      });

      queue.enqueue({
        callback: async () => {
          await wait(500);
          testCallback(2);
        }
      });

      queue.on('idle', () => {
        expect(testCallback.mock.calls).toMatchSnapshot();
        done();
      });
    });

    test('normal queue with cancel', function (done) {
      const queue = new Queue({ concurrent: 1 });

      queue.enqueue({
        callback: async () => {
          await wait(500);
          testCallback(1);
        }
      });

      const someTask = queue.enqueue({
        callback: async () => {
          await wait(500);
          testCallback(2);
        }
      });
      someTask.cancel();

      queue.enqueue({
        callback: async () => {
          await wait(500);
          testCallback(3);
        }
      });

      queue.on('idle', () => {
        expect(testCallback.mock.calls).toMatchSnapshot();
        done();
      });
    });
  });
});

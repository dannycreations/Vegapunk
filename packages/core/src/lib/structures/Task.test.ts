import { expect, test, vi } from 'vitest';

import { Vegapunk } from '../Vegapunk';
import { Task } from './Task';

const expectedOutput = [
  '1 0.1 awake',
  '2 1.1 awake',
  '3 2.1 awake',
  '4 5.1 awake',
  '5 7.1 awake',
  '6 7.2 start',
  '7 0.2 start',
  '8 1.2 start',
  '9 3.2 start',
  '10 5.2 start',
  '11 7.3 update',
  '12 0.3 update',
  '13 1.3 update',
  '14 2.3 update',
  '15 3.3 update',
  '16 4.3 update',
  '17 5.3 update',
  '18 6.3 update 6 test',
];

test('Task sequence test', async () => {
  let i = 0;
  const capturedLogs: string[] = [];
  const consoleSpy = vi.spyOn(console, 'log').mockImplementation((...args) => {
    capturedLogs.push(args.join(' '));
  });

  const client = new Vegapunk();
  await client.start();

  const OBSERVER_TASK = await Task.createTask({
    async update() {
      if (i < expectedOutput.length) return;
      expect(capturedLogs).toEqual(expectedOutput);
      await OBSERVER_TASK.unload();
    },
    options: { ref: true },
  });

  const zeroTask = await Task.createTask({
    awake: () => console.log(++i, '0.1 awake'),
    start: () => console.log(++i, '0.2 start'),
    update() {
      console.log(++i, '0.3 update');
      return zeroTask.unload();
    },
  });

  const oneTask = await Task.createTask({
    awake: () => console.log(++i, '1.1 awake'),
    start: () => console.log(++i, '1.2 start'),
    update() {
      console.log(++i, '1.3 update');
      return oneTask.unload();
    },
    options: { delay: 1100 },
  });

  const twoTask = await Task.createTask({
    awake: () => console.log(++i, '2.1 awake'),
    update() {
      console.log(++i, '2.3 update');
      return twoTask.unload();
    },
    options: { delay: 1200 },
  });

  const threeTask = await Task.createTask({
    start: () => console.log(++i, '3.2 start'),
    update() {
      console.log(++i, '3.3 update');
      return threeTask.unload();
    },
    options: { delay: 1300 },
  });

  const fourTask = await Task.createTask({
    update() {
      console.log(++i, '4.3 update');
      return fourTask.unload();
    },
    options: { delay: 1400 },
  });

  const fiveTask = await Task.createTask({
    awake: () => console.log(++i, '5.1 awake'),
    start: () => console.log(++i, '5.2 start'),
    update() {
      console.log(++i, '5.3 update');
      return fiveTask.unload();
    },
    options: { delay: 1500, enabled: false },
  });
  fiveTask.startTask();

  const sixName = '6 test';
  const sixTask = await Task.createTask({
    update() {
      console.log(++i, '6.3 update ' + sixTask.name);
      return sixTask.unload();
    },
    options: { name: sixName, delay: 1600 },
  });

  const sevenTask = await Task.createTask({
    awake: () => console.log(++i, '7.1 awake'),
    start: () => console.log(++i, '7.2 start'),
    update() {
      console.log(++i, '7.3 update');
      return sevenTask.unload();
    },
    options: { delay: 1700, enabled: false },
  });
  sevenTask.startTask(true);

  consoleSpy.mockRestore();
});

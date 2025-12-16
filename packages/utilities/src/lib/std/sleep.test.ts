import { expect, test } from 'vitest';

import { noop } from './common';
import { waitUntil } from './sleep';

test('should immediate without retries', async () => {
  let callCount = 0;
  await waitUntil(() => (callCount++, true));
  expect(callCount).toEqual(1);
});

test('should retry until callback resolve', async () => {
  let callCount = 0;
  await waitUntil((resolve, i) => (i > 4 ? resolve() : (callCount++, false)));
  expect(callCount).toEqual(5);
});

test('should use a custom delay', async () => {
  const start = performance.now();
  await waitUntil(
    (_, i) => {
      if (i > 1) {
        return true;
      }

      setTimeout(noop, 200);
      return false;
    },
    { delay: 100 },
  );
  const end = performance.now();
  expect(end - start).greaterThanOrEqual(100);
});

test('should waiting until status true', async () => {
  let status = false;
  setTimeout(() => (status = true), 500);

  const start = performance.now();
  await waitUntil(() => status);
  const end = performance.now();
  expect(end - start).greaterThanOrEqual(500);
});

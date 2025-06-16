import { expect, test } from 'vitest'
import { noop } from '../dist/lib/std/common'
import { waitUntil } from '../dist/lib/std/sleep'

test('should immediate without retries', async () => {
  let callCount = 0
  await waitUntil(() => (callCount++, true))
  expect(callCount).toEqual(1)
})

test('should retry until callback resolve', async () => {
  let callCount = 0
  await waitUntil((resolve, i) => (i > 4 ? resolve() : (callCount++, false)))
  expect(callCount).toEqual(5)
})

test('should use a custom delay', async () => {
  const start = Date.now()
  await waitUntil(
    (_, i) => {
      if (i > 1) return true
      setTimeout(noop, 25)
      return false
    },
    { delay: 20 },
  )
  const end = Date.now()
  expect(end - start).toBeGreaterThan(40)
})

test('should waiting until status true', async () => {
  let status = false
  setTimeout(() => (status = true), 500)

  const start = Date.now()
  await waitUntil(() => status)
  const end = Date.now()
  expect(end - start).toBeGreaterThan(500)
})

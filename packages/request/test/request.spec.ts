import { expect, test } from 'vitest'
import { requestDefault } from '../dist'

test('should statusCode 200', () => {
	expect(requestDefault({ url: 'https://google.com' })).resolves.toHaveProperty('statusCode', 200)
})

test('should errorCode ETIMEDOUT', () => {
	expect(
		requestDefault({
			url: 'https://github.com/json-iterator/test-data/raw/master/large-file.json',
			timeout: { total: 2000 },
			retry: 0,
		}),
	).rejects.toHaveProperty('code', 'ETIMEDOUT')
})

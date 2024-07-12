const { requestDefault } = require('../')

describe('request', function () {
	it('should statusCode 200', () => {
		return requestDefault({ url: 'https://google.com' }).should.eventually.property('statusCode', 200)
	})
	it('should code ETIMEDOUT', () => {
		return requestDefault({
			url: 'https://github.com/json-iterator/test-data/raw/master/large-file.json',
			retry: 0,
			timeout: { total: 2000 },
		}).should.eventually.rejected.property('code', 'ETIMEDOUT')
	})
})

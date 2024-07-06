const { requestDefault } = require('../')

const { expect } = chai

describe('request', function () {
	it('should statusCode 200', (done) => {
		requestDefault({ url: 'https://google.com' }).then((res) => {
			expect(res.statusCode).equal(200)
			done()
		})
	})
	it('should ERR_CANCELED', (done) => {
		requestDefault({
			url: 'https://github.com/json-iterator/test-data/raw/master/large-file.json',
			retry: 0,
			timeout: { total: 2000 },
		}).catch((err) => {
			expect(err.code).equal('ERR_CANCELED')
			done()
		})
	})
})

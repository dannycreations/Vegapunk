const { requestTimeout } = require('../')

const { expect } = chai

describe('request', function () {
	it('should statusCode 200', (done) => {
		requestTimeout({ url: 'https://google.com' }).then((res) => {
			expect(res.statusCode).equal(200)
			done()
		})
	})
	it('should Promise was canceled', (done) => {
		requestTimeout({
			url: 'https://github.com/json-iterator/test-data/raw/master/large-file.json',
			totalTimeout: 2000,
		}).catch((err) => {
			expect(err.message).equal('Promise was canceled')
			done()
		})
	})
})

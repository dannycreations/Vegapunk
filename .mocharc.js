'use strict'

module.exports = {
	require: [require.resolve('./test/setup.js')],
	forbidOnly: Boolean(process.env.CI),
	color: true,
	timeout: '10s',
}

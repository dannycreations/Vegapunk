'use strict'

module.exports = {
	require: [require.resolve('./scripts/mocha.config.js')],
	forbidOnly: Boolean(process.env.CI),
	color: true,
	timeout: '10s',
}

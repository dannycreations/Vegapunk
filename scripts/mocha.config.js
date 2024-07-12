const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')

global.chai = chai.use(chaiAsPromised)
global.should = chai.should()

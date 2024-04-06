require('ts-node').register()

const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const sinonChai = require('sinon-chai')

global.chai = chai.use(chaiAsPromised).use(sinonChai)
global.should = chai.should()

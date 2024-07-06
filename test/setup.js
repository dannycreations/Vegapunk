require('ts-node').register()

const chai = require('chai')
const sinonChai = require('sinon-chai')
const chaiAsPromised = require('chai-as-promised')

global.chai = chai.use(chaiAsPromised).use(sinonChai)
global.should = chai.should()

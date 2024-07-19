process.env.NODE_ENV = 'test'

// just set up the test globals, not the test database

const chai = require('chai')

chai.use(require('chai-things'))
chai.use(require('chai-spies'))
chai.use(require('chai-as-promised'))
chai.use(require('chai-datetime'))

global.spy = chai.spy
global.expect = chai.expect

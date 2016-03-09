process.env.NODE_ENV = 'test'

var skiff = require('../lib/skiff')
var chai = require('chai')
var fs = require('fs')
var path = require('path')
var Promise = require('bluebird')
var root = require('root-path')

chai.use(require('chai-spies'))
chai.use(require('chai-as-promised'))

global.spy = chai.spy
global.expect = chai.expect

require('mock-kue')

var TestSetup = function () {
  this.tables = []
}

var setup = new TestSetup()

before(function (done) {
  this.timeout(30000)

  var i18n = require('i18n')
  i18n.configure(require(root('config/i18n')))
  global.sails = skiff.sails

  skiff.lift({
    log: {level: process.env.LOG_LEVEL || 'warn'},
    silent: true,
    start: function () {
      // add controllers to the global namespace; they would otherwise be excluded
      // since the sails "http" module is not being loaded in the test env
      _.each(fs.readdirSync(root('api/controllers')), function (filename) {
        if (path.extname(filename) === '.js') {
          var modelName = path.basename(filename, '.js')
          global[modelName] = require(root('api/controllers/' + modelName))
        }
      })

      setup.createSchema()
      .then(() => done())
      .catch(done)
    }
  })
})

TestSetup.prototype.createSchema = function () {
  return bookshelf.transaction(trx => {
    return bookshelf.knex.raw('drop schema public cascade').transacting(trx)
    .then(() => bookshelf.knex.raw('create schema public').transacting(trx))
    .then(() => {
      var script = fs.readFileSync(root('migrations/schema.sql')).toString()
      return script.split(/\n/)
      .filter(line => !line.startsWith('--'))
      .join(' ')
      .replace(/\s+/g, ' ')
      .split(/;\s?/)
      .map(line => line.trim())
      .filter(line => line !== '')
    })
    .each(command => {
      if (command.startsWith('CREATE TABLE')) {
        this.tables.push(command.split(' ')[2])
      }
      return bookshelf.knex.raw(command).transacting(trx)
    })
  }) // transaction
}

TestSetup.prototype.clearDb = function () {
  return bookshelf.knex.transaction(trx => trx.raw('set constraints all deferred')
  .then(() => Promise.map(this.tables, table => trx.raw('delete from ' + table))))
}

module.exports = setup

process.env.NODE_ENV = 'test'

import nock from 'nock'
import './core'
var skiff = require('../../lib/skiff')
var fs = require('fs')
var path = require('path')
var Promise = require('bluebird')
var root = require('root-path')

var TestSetup = function () {
  this.tables = []
  this.initialized = false
}

var setup = new TestSetup()

before(function (done) {
  this.timeout(30000)

  var i18n = require('i18n')
  i18n.configure(require(root('config/i18n')).i18n)
  global.sails = skiff.sails

  skiff.lift({
    log: {level: process.env.LOG_LEVEL || 'warn'},
    silent: true,
    start: function () {
      const { database } = bookshelf.knex.client.connectionSettings
      if (!database.match(/^test|test$/)) {
        const error = new Error(`Invalid test database name "${database}". It must start or end with "test".`)
        return done(error)
      }

      setup.initialized = true

      // add controllers to the global namespace; they would otherwise be excluded
      // since the sails "http" module is not being loaded in the test env
      fs.readdirSync(root('api/controllers')).forEach(function (filename) {
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

after(skiff.lower)

afterEach(() => nock.cleanAll())

TestSetup.prototype.createSchema = function () {
  if (!this.initialized) throw new Error('not initialized')
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
      // Adding back search path which schema dump turns off
      return bookshelf.knex.raw(command + '; SET search_path = public, pg_catalog;').transacting(trx)
    })
  }) // transaction
}

TestSetup.prototype.clearDb = function () {
  if (!this.initialized) throw new Error('not initialized')
  return bookshelf.knex.transaction(trx => trx.raw('set constraints all deferred')
  .then(() => Promise.map(this.tables, table => trx.raw('delete from ' + table))))
}

module.exports = setup

/**
 * Bootstrap
 * (sails.config.bootstrap)
 *
 * An asynchronous bootstrap function that runs before your Sails app gets lifted.
 * This gives you an opportunity to set up your data model, run jobs, or perform some special logic.
 *
 * For more information on bootstrapping your app, check out:
 * http://sailsjs.org/#/documentation/reference/sails.config/sails.config.bootstrap.html
 */

require('dotenv').load()

var fs = require('fs')
var path = require('path')
var root = require('root-path')
var util = require('util')

// very handy, these
global.format = util.format
global.Promise = require('bluebird')
global._ = require('lodash') // override Sails' old version of lodash

module.exports.bootstrap = function (done) {
  var knex = require('knex')(require('../knexfile')[process.env.NODE_ENV])

  if (process.env.DEBUG_MEMORY) {
    require('colors')
    sails.log.info('memwatch: starting'.red)
    var memwatch = require('memwatch-next')

    memwatch.on('leak', info => sails.log.info('memwatch: memory leak!'.red, info))

    memwatch.on('stats', stats => {
      sails.log.info('memwatch: stats:'.red + '\n' + util.inspect(stats))
    })
  }

  // log SQL queries
  if (process.env.DEBUG_SQL) {
    require('colors')
    knex.on('query', function (data) {
      var args = (_.clone(data.bindings) || []).map(function (s) {
        if (s === null) return 'null'.blue
        if (s === undefined) return 'undefined'.red
        if (typeof (s) === 'object') return JSON.stringify(s).blue
        return s.toString().blue
      })
      args.unshift(data.sql.replace(/\?/g, '%s'))

      // TODO fix missing limit and boolean values
      var query = util.format.apply(util, args)
        .replace(/^(select|insert|update)/, '$1'.yellow)

      sails.log.info(query)
    })
  }

  if (sails.config.environment === 'production') {
    var rollbar = require('rollbar')

    knex.on('query', function (data) {
      if (_.includes(data.bindings, 'undefined')) {
        rollbar.handleErrorWithPayloadData('undefined value in SQL query', {
          custom: {
            sql: data.sql,
            bindings: data.bindings
          }
        })
      }
    })
  }

  // add bookshelf and each model to global namespace
  global.bookshelf = require('bookshelf')(knex)
  _.each(fs.readdirSync(root('api/models')), function (filename) {
    if (path.extname(filename) === '.js') {
      var modelName = path.basename(filename, '.js')
      global[modelName] = require(root('api/models/' + modelName))
    }
  })

  // add presenters to global namespace
  _.each(fs.readdirSync(root('api/presenters')), function (filename) {
    if (path.extname(filename) === '.js') {
      var modelName = path.basename(filename, '.js')
      global[modelName] = require(root('api/presenters/' + modelName))
    }
  })

  // It's very important to trigger this callback method when you are finished
  // with the bootstrap!  (otherwise your server will never lift, since it's waiting on the bootstrap)
  done()
}

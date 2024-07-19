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

import util from 'util'
import models from '../api/models'
import queryMonitor from '../lib/util/queryMonitor'
import { red } from 'chalk'
require('dotenv').load()

// very handy, these
global.format = util.format
global.Promise = require('bluebird')
global._ = require('lodash') // override Sails' old version of lodash

module.exports.bootstrap = function (done) {
  models.init()

  if (process.env.DEBUG_MEMORY) {
    sails.log.info(red('memwatch: starting'))
    var memwatch = require('@airbnb/node-memwatch')

    memwatch.on('leak', info => sails.log.info(red('memwatch: memory leak!'), info))

    memwatch.on('stats', stats => {
      sails.log.info(red('memwatch: stats:') + '\n' + util.inspect(stats))
    })
  }

  if (process.env.DEBUG_SQL) queryMonitor(bookshelf.knex)

  // It's very important to trigger this callback method when you are finished
  // with the bootstrap!  (otherwise your server will never lift, since it's waiting on the bootstrap)
  done()
}

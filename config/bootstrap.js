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

require('dotenv').load();

var fs = require('fs'),
  path = require('path'),
  root = require('root-path'),
  util = require('util');

module.exports.bootstrap = function(done) {

  var knex = require('knex')(require('../knexfile')[process.env.NODE_ENV]);

  // log SQL queries
  if (sails.config.environment == 'development') {
    require('colors');
    knex.on('query', function(data) {
      var args = (_.clone(data.bindings) || []).map(function(s) {
        if (s === null) return 'null'.blue;
        if (s === undefined) return 'undefined'.red;
        return s.toString().blue;
      });
      args.unshift(data.sql.replace(/\?/g, '%s'));

      // TODO fix missing limit and boolean values
      var query = util.format.apply(util, args)
        .replace(/^(select|insert|update)/, '$1'.black.bgGreen);

      sails.log.info(query);
    });

  } else if (sails.config.environment == 'production') {
    var rollbar = require('rollbar');

    knex.on('query', function(data) {
      if (_.contains(data.bindings, 'undefined')) {
        rollbar.handleError('undefined value in SQL query', {
          sql: data.sql,
          bindings: data.bindings
        });
      }
    });
  }

  // add bookshelf and each model to global namespace
  global.bookshelf = require('bookshelf')(knex);
  _.each(fs.readdirSync(root('api/models')), function(filename) {
    if (path.extname(filename) == '.js') {
      var modelName = path.basename(filename, '.js');
      global[modelName] = require(root('api/models/' + modelName));
    }
  });

  // fix request titles in New Relic
  if (process.env.NEW_RELIC_LICENSE_KEY) {
    var newrelic = require('newrelic');
    sails.on('router:route', function(data) {
      if (_.has(data.options, 'controller') && _.has(data.options, 'action')) {
        var transactionName = util.format('%s#%s', data.options.controller, data.options.action);
        newrelic.setTransactionName(transactionName);
      }
    });
  }

  // because we use this all the time
  global.Promise = require('bluebird');

  // It's very important to trigger this callback method when you are finished
  // with the bootstrap!  (otherwise your server will never lift, since it's waiting on the bootstrap)
  done();
};

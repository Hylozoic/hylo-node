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

if (!process.env.DATABASE_URL) throw 'DATABASE_URL is not set';

var url = require('url').parse(process.env.DATABASE_URL), user, password;
if (url.auth) {
  var i = url.auth.indexOf(':');
  user = url.auth.slice(0, i);
  password = url.auth.slice(i + 1);
}

module.exports.bootstrap = function(done) {

  var knex = require('knex')({
    client: 'pg',
    connection: {
      host: url.hostname,
      port: url.port,
      user: user,
      password: password,
      database: url.path.substring(1)
    }
  });

  // log SQL queries
  if (sails.config.environment == 'development') {
    require('colors');
    knex.on('query', function(data) {
      var args = (_.clone(data.bindings) || []).map(function(s) {
        if (s === null) return 'null'.blue;
        return s.toString().blue;
      });
      args.unshift(data.sql.replace(/\?/g, '%s'));

      // TODO fix missing limit and boolean values
      var query = util.format.apply(util, args)
        .replace(/^(select|insert|update)/, '$1'.black.bgGreen);

      sails.log.debug(query);
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

  // It's very important to trigger this callback method when you are finished
  // with the bootstrap!  (otherwise your server will never lift, since it's waiting on the bootstrap)
  done();
};

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

var fs = require('fs'),
  path = require('path'),
  root = require('root-path');

if (!process.env.DATABASE_URL) throw 'DATABASE_URL is not set';

var url = require('url').parse(process.env.DATABASE_URL), user, password;
if (url.auth) {
  var i = url.auth.indexOf(':');
  user = url.auth.slice(0, i);
  password = url.auth.slice(i + 1);
}

module.exports.bootstrap = function(cb) {

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

  global.bookshelf = require('bookshelf')(knex);

  _.each(fs.readdirSync(root('api/models')), function(filename) {
    if (path.extname(filename) == '.js') {
      var modelName = path.basename(filename, '.js');
      global[modelName] = require(root('api/models/' + modelName));
    }
  });

  // It's very important to trigger this callback method when you are finished
  // with the bootstrap!  (otherwise your server will never lift, since it's waiting on the bootstrap)
  cb();
};

var fs = require('fs'),
  path = require('path'),
  root = require('root-path');

global.expect = require('chai').expect;
global._      = require('lodash');

global.requireFromRoot = function(path) {
  return require(root(path));
}

module.exports = {
  createDb: function(done) {
    var knex = require('knex')({client: 'sqlite3', connection: {filename: ':memory:'}});
    global.bookshelf = require('bookshelf')(knex);

    // FIXME this is duplicated from bootstrap.js
    _.each(fs.readdirSync(root('api/models')), function(filename) {
      if (path.extname(filename) == '.js') {
        var modelName = path.basename(filename, '.js');
        global[modelName] = require(root('api/models/' + modelName));
      }
    });

    knex.schema.createTable('users', function(table) {
      table.increments();
      table.string('name');
      table.string('email');
    })
    .then(function() {
      return knex.schema.createTable('community', function(table) {
        table.increments();
        table.string('name');
        table.string('beta_access_code');
      });
    })
    .then(function() {
      knex.schema.createTable('users_community', function(table) {
        table.bigInteger('users_id');
        table.bigInteger('community_id');
      }).exec(done);
    });
  }
};
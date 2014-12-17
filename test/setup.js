var async = require('async'),
  fs = require('fs'),
  path = require('path'),
  root = require('root-path');

process.env.NODE_ENV = 'test';
require('dotenv').load(); // loads ".env.test"

global.expect = require('chai').expect;
global._      = require('lodash');

global.requireFromRoot = function(path) {
  return require(root(path));
}

var TestSetup = function() {
  this.knex = require('knex')({client: 'sqlite3', connection: {filename: ':memory:'}});
  global.bookshelf = require('bookshelf')(this.knex);

  // FIXME this is duplicated from bootstrap.js
  _.each(fs.readdirSync(root('api/models')), function(filename) {
    if (path.extname(filename) == '.js') {
      var modelName = path.basename(filename, '.js');
      global[modelName] = require(root('api/models/' + modelName));
    }
  });
};

TestSetup.prototype.initDb = function(done) {
  if (this.dbInited) return done();
  var knex = this.knex;

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
      table.string('slug');
    });
  })
  .then(function() {
    return knex.schema.createTable('users_community', function(table) {
      table.bigInteger('users_id');
      table.bigInteger('community_id');
      table.integer('role');
    });
  })
  .then(function() {
    return knex.schema.createTable('community_invite', function(table) {
      table.increments();
      table.bigInteger('invited_by_id');
      table.bigInteger('used_by_id');
      table.bigInteger('community_id');
      table.string('email');
      table.string('token');
      table.integer('role');
      table.datetime('created');
    });
  }).then(function() {
    this.dbInited = true;
    done();
  }.bind(this));
};

TestSetup.prototype.clearDb = function(done) {
  async.each(
    ['users', 'community', 'users_community', 'community_invite'],
    function(table, cb) {
      this.knex.raw('delete from ' + table).exec(cb);
    }.bind(this),
    function(err) {
      done();
    }
  );
};

module.exports = new TestSetup();
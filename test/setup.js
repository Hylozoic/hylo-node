var async = require('async'),
  fs = require('fs'),
  path = require('path'),
  root = require('root-path'),
  Promise = require('bluebird');

process.env.NODE_ENV = 'test';
require('dotenv').load(); // loads ".env.test"

global.expect = require('chai').expect;
global._      = require('lodash');

global.requireFromRoot = function(path) {
  return require(root(path));
};

var i18n = require('sails/node_modules/i18n');
i18n.configure(requireFromRoot('config/i18n'));
global.__ = i18n.__;

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
  _.each(fs.readdirSync(root('api/services')), function(filename) {
    if (path.extname(filename) == '.js') {
      var serviceName = path.basename(filename, '.js');
      global[serviceName] = require(root('api/services/' + serviceName));
    }
  });
};

TestSetup.prototype.initDb = function(done) {
  if (this.dbInited) return done();
  var knex = this.knex;

  Promise.all([
    knex.schema.createTable('users', function(table) {
      table.increments();
      table.string('name');
      table.string('email');
    }),
    knex.schema.createTable('post', function(table) {
      table.increments();
      table.string('name');
      table.string('description');
      table.string('type');
      table.string('image_url');
      table.bigInteger('creator_id');
      table.datetime('creation_date');
      table.integer('num_votes');
      table.integer('num_comments');
      table.boolean('fulfilled');
      table.boolean('active');
      table.boolean('edited');
      table.datetime('last_updated')
    }),
    knex.schema.createTable('contributor', function(table) {
      table.increments();
      table.bigInteger('post_id');
      table.bigInteger('user_id');
      table.datetime('date_contributed');
    }),
    knex.schema.createTable('comment', function(table) {
      table.increments();
      table.bigInteger('post_id');
      table.bigInteger('user_id');
      table.datetime('date_commented');
      table.string("comment_text");
      table.boolean("active");
    }),
    knex.schema.createTable('notification', function(table) {
      table.increments();
      table.bigInteger('post_id');
      table.bigInteger('comment_id');
      table.bigInteger('vote_id');
      table.bigInteger('actor_id');
      table.datetime('timestamp');
      table.string("type");
      table.boolean("processed");
    }),
    knex.schema.createTable('follower', function(table) {
      table.increments();
      table.bigInteger('post_id');
      table.bigInteger('user_id');
      table.bigInteger('added_by_id');
      table.datetime('date_added');
    }),
    knex.schema.createTable('community', function(table) {
      table.increments();
      table.string('name');
      table.string('beta_access_code');
      table.string('slug');
    }),
    knex.schema.createTable('users_community', function(table) {
      table.bigInteger('users_id');
      table.bigInteger('community_id');
      table.integer('role');
    }),
    knex.schema.createTable('post_community', function(table) {
      table.bigInteger('post_id');
      table.bigInteger('community_id');
      table.integer('role');
    }),
    knex.schema.createTable('community_invite', function(table) {
      table.increments();
      table.bigInteger('invited_by_id');
      table.bigInteger('used_by_id');
      table.bigInteger('community_id');
      table.string('email');
      table.string('token');
      table.integer('role');
      table.datetime('created');
    }),
    knex.schema.createTable('users_skill', function(table) {
      table.bigInteger('users_id');
      table.string('skill_name');
    }),
    knex.schema.createTable('users_org', function(table) {
      table.bigInteger('users_id');
      table.string('org_name');
    })
    ]).then(function() {
      this.dbInited = true;
      done();
    }.bind(this));
};

TestSetup.prototype.clearDb = function(done) {
  async.each(
    ['users', 'community', 'users_community', 'community_invite',
      'users_org', 'users_skill', 'post_community', 'follower',
      'notification', 'comment', 'contributor', 'post'
    ],
    function(table, cb) {
      this.knex.raw('delete from ' + table).exec(cb);
    }.bind(this),
    function(err) {
      done();
    }
  );
};

module.exports = new TestSetup();

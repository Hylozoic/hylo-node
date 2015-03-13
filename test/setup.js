process.env.NODE_ENV = 'test';

var skiff = require('../lib/skiff'),
  chai = require('chai'),
  fs = require('fs'),
  path = require('path'),
  root = require('root-path'),
  setup;

chai.use(require('chai-spies'));
global.spy = chai.spy;
global.expect = chai.expect;

require('mock-kue');

before(function(done) {
  this.timeout(5000);
  skiff.lift({
    silent: true,

    start: function() {
      // add controllers to the global namespace; they would otherwise be excluded
      // since the sails "http" module is not being loaded in the test env
      _.each(fs.readdirSync(root('api/controllers')), function(filename) {
        if (path.extname(filename) == '.js') {
          var modelName = path.basename(filename, '.js');
          global[modelName] = require(root('api/controllers/' + modelName));
        }
      });

      global.__ = skiff.sails.__;

      setup.initDb(done);
    }
  });
});

global.requireFromRoot = function(path) {
  return require(root(path));
};

var i18n = require('sails/node_modules/i18n');
i18n.configure(requireFromRoot('config/i18n'));

var TestSetup = function() {
  this.sails = skiff.sails;
};

setup = new TestSetup();

TestSetup.prototype.initDb = function(done) {
  if (this.dbInited) return done();
  var knex = this.knex = bookshelf.knex;

  Promise.all([
    knex.schema.createTable('users', function(table) {
      table.increments();
      table.string('name');
      table.string('email');
      table.boolean('active');
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
    knex.schema.createTable('vote', function(table) {
      table.increments();
      table.bigInteger('post_id');
      table.bigInteger('user_id');
      table.datetime('date_voted');
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
    knex.schema.createTable('activity', function(table) {
      table.increments().primary();
      table.bigInteger('actor_id').references('id').inTable('users');
      table.bigInteger('reader_id').references('id').inTable('users');
      table.bigInteger('post_id').references('id').inTable('post');
      table.bigInteger('comment_id').references('id').inTable('comment');
      table.string('action');
      table.boolean('unread').defaultTo(true);
      table.timestamps();
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
      table.boolean('active');
      table.integer('role');
      table.datetime('date_joined');
      table.bigInteger('fee');
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
      table.bigInteger('user_id');
      table.string('skill_name');
    }),
    knex.schema.createTable('users_org', function(table) {
      table.bigInteger('user_id');
      table.string('org_name');
    }),
    knex.schema.createTable('media', function(table) {
      table.increments();
      table.bigInteger('post_id');
      table.string('url');
    })
  ]).then(function() {
    this.dbInited = true;
    done();
  }.bind(this));
};

TestSetup.prototype.clearDb = function(done) {
  Promise.map(
    [
      'users', 'community', 'users_community', 'community_invite',
      'users_org', 'users_skill', 'post_community', 'follower',
      'notification', 'comment', 'contributor', 'post', 'media', 'vote'
    ],
    function(table) {
      return this.knex.raw('delete from ' + table);
    }.bind(this)
  )
  .then(function() {
    done();
  })
  .catch(done);
};

module.exports = setup;

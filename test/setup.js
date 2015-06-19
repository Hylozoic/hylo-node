process.env.NODE_ENV = 'test';

var TestSetup = function() {};

var skiff = require('../lib/skiff'),
  chai = require('chai'),
  fs = require('fs'),
  path = require('path'),
  root = require('root-path'),
  setup;

chai.use(require('chai-spies'));
chai.use(require('chai-as-promised'));

global.spy = chai.spy;
global.expect = chai.expect;

require('mock-kue');

before(function(done) {
  this.timeout(5000);

  var i18n = require('sails/node_modules/i18n');
  i18n.configure(require(root('config/i18n')));
  global.sails = skiff.sails;

  skiff.lift({
    log: {level: 'warn'},
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

      setup.resetDb()
      .then(function() {
        done();
      }).catch(done);
    }
  });
});

module.exports = setup = {

  resetDb: function() {
    var knex = bookshelf.knex;

    return bookshelf.transaction(function(trx) {

      var createTable = function(name, commands) {
        return knex.schema.createTable(name, commands).transacting(trx);
      };

      return knex.raw('drop schema public cascade').transacting(trx)
      .then(function() {
        return knex.raw('create schema public').transacting(trx);
      }).then(function() {
        return Promise.join(
          createTable('users', function(table) {
            table.bigIncrements();
            table.string('name');
            table.string('email');
            table.string('avatar_url');
            table.string('facebook_url');
            table.string('linkedin_url');
            table.string('twitter_name');
            table.boolean('active');
            table.boolean('daily_digest');
            table.boolean('send_email_preference');
            table.integer('new_notification_count').defaultTo(0);
            table.datetime('last_login');
            table.datetime('created_at');
            table.string('bio');
            table.text('work');
            table.text('intention');
            table.text('extra_info');
          }),
          createTable('linked_account', function(table) {
            table.increments();
            table.bigInteger('user_id').references('id').inTable('users');
            table.string('provider_user_id');
            table.string('provider_key');
          }),
          createTable('post', function(table) {
            table.bigIncrements();
            table.string('name');
            table.string('description');
            table.string('type');
            table.string('image_url');
            table.bigInteger('creator_id');
            table.datetime('created_at');
            table.integer('num_votes');
            table.integer('num_comments');
            table.datetime('fulfilled_at');
            table.boolean('active');
            table.boolean('edited');
            table.datetime('updated_at');
            table.integer('visibility').defaultTo(0);
          }),
          createTable('vote', function(table) {
            table.increments();
            table.bigInteger('post_id');
            table.bigInteger('user_id');
            table.datetime('date_voted');
          }),
          createTable('contributor', function(table) {
            table.increments();
            table.bigInteger('post_id');
            table.bigInteger('user_id');
            table.datetime('date_contributed');
          }),
          createTable('comment', function(table) {
            table.increments();
            table.bigInteger('post_id');
            table.bigInteger('user_id');
            table.datetime('created_at');
            table.string("comment_text");
            table.boolean("active");
          }),
          createTable('notification', function(table) {
            table.increments();
            table.bigInteger('post_id');
            table.bigInteger('comment_id');
            table.bigInteger('vote_id');
            table.bigInteger('actor_id');
            table.datetime('timestamp');
            table.string("type");
            table.boolean("processed");
          }),
          createTable('activity', function(table) {
            table.increments().primary();
            table.bigInteger('actor_id').references('id').inTable('users');
            table.bigInteger('reader_id').references('id').inTable('users');
            table.bigInteger('post_id').references('id').inTable('post');
            table.bigInteger('comment_id').references('id').inTable('comment');
            table.string('action');
            table.boolean('unread').defaultTo(true);
            table.timestamps();
          }),
          createTable('follower', function(table) {
            table.increments();
            table.bigInteger('post_id');
            table.bigInteger('user_id');
            table.bigInteger('added_by_id');
            table.datetime('date_added');
          }),
          createTable('community', function(table) {
            table.increments();
            table.string('name');
            table.string('beta_access_code');
            table.string('slug');
            table.bigInteger('network_id').references('id').inTable('networks');
          }),
          createTable('users_community', function(table) {
            table.bigInteger('users_id');
            table.bigInteger('community_id');
            table.boolean('active');
            table.integer('role');
            table.datetime('date_joined');
            table.bigInteger('fee');
          }),
          createTable('post_community', function(table) {
            table.bigInteger('post_id');
            table.bigInteger('community_id');
            table.integer('role');
          }),
          createTable('community_invite', function(table) {
            table.increments();
            table.bigInteger('invited_by_id');
            table.bigInteger('used_by_id');
            table.bigInteger('community_id');
            table.datetime('used_on');
            table.string('email');
            table.string('token');
            table.integer('role');
            table.datetime('created');
          }),
          createTable('users_skill', function(table) {
            table.bigInteger('user_id');
            table.string('skill_name');
          }),
          createTable('users_org', function(table) {
            table.bigInteger('user_id');
            table.string('org_name');
          }),
          createTable('phones', function(table) {
            table.increments().primary();
            table.bigInteger('user_id').references('id').inTable('users');
            table.string('value');
          }),
          createTable('emails', function(table) {
            table.increments().primary();
            table.bigInteger('user_id').references('id').inTable('users');
            table.string('value');
          }),
          createTable('websites', function(table) {
            table.increments().primary();
            table.bigInteger('user_id').references('id').inTable('users');
            table.string('value');
          }),
          createTable('media', function(table) {
            table.increments();
            table.bigInteger('post_id');
            table.string('url');
          }),
          createTable('tours', function(table) {
            table.increments();
            table.bigInteger('user_id');
            table.string('type');
            table.json('status');
            table.timestamps();
          }),
          createTable('thank_you', function(table) {
            table.increments();
            table.bigInteger('user_id');
            table.bigInteger('comment_id');
            table.datetime('date_thanked');
            table.bigInteger('thanked_by_id');
          }),
          createTable('projects', table => {
            table.increments();
            table.bigInteger('community_id').references('id').inTable('community');
            table.timestamps();
          }),
          createTable('posts_projects', table => {
            table.increments();
            table.bigInteger('post_id');
            table.bigInteger('project_id');
            table.timestamps();
          }),
          createTable('projects_users', table => {
            table.increments();
            table.bigInteger('project_id');
            table.bigInteger('user_id');
            table.timestamps();
          }),
          createTable('devices', table => {
            table.increments();
            table.bigInteger('user_id');
            table.timestamps();
          }),
          createTable('networks', table => {
            table.increments();
            table.string('name');
            table.text('description');
            table.string('avatar_url');
            table.string('banner_url');
            table.string('slug').unique();
            table.timestamps();
          })
        );
      });

    }); // transaction

  }
}

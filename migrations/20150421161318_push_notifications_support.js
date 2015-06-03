'use strict';

exports.up = function(knex, Promise) {
    return knex.schema.createTable('devices', function (table) {
	table.increments();
	table.bigInteger('user_id').references('id').inTable('users');
	table.string('token');
	table.timestamps();
    });
};

exports.down = function(knex, Promise) {
    return knex.schema.dropTable('devices');  
};

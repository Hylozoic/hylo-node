'use strict';

exports.up = function(knex, Promise) {
    return knex.schema.createTable('queued_pushes', function (table) {
	table.increments();
	table.string('device_token');
	table.string('payload');
	table.dateTime('time_queued');
	table.dateTime('time_sent');
    });
};

exports.down = function(knex, Promise) {
    return knex.schema.dropTable('queued_pushes');    
};

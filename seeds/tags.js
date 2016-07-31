'use strict';

exports.seed = function(knex, Promise) {
    return Promise.join(
        // Deletes ALL existing entries
        knex('tags').del(),

        // Inserts seed entries
        knex('tags').insert({id: 1, name: 'offer'}),
        knex('tags').insert({id: 2, name: 'request'})
    );
};
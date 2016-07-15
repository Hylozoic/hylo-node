'use strict';

exports.seed = function(knex, Promise) {
    return Promise.join(
        // Deletes ALL existing entries
        knex('community').del(),

        // Inserts seed entries
        knex('community').insert({id: 1, name: 'starter-posts', slug: 'starter-posts'})
    );
};
'use strict'

exports.seed = function (knex, Promise) {
  return knex('tags').del()
    .then(() => knex('tags').insert([
      {id: 1, name: 'offer'},
      {id: 2, name: 'request'},
      {id: 3, name: 'intention'}
    ]))
}

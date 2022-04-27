
exports.up = function(knex, Promise) {
  return knex.raw('alter table users alter constraint users_location_id_foreign deferrable initially deferred')
};

exports.down = function(knex, Promise) {
  
};

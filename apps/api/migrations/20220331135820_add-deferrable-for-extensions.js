
exports.up = function(knex, Promise) {
  return knex.raw('alter table group_extensions alter constraint group_extensions_extension_id_foreign deferrable initially deferred')
  return knex.raw('alter table group_extensions alter constraint group_extensions_group_id_foreign deferrable initially deferred')
};

exports.down = function(knex, Promise) {
  
};

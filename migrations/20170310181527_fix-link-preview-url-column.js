
exports.up = function(knex, Promise) {
  return knex.raw('alter table link_previews alter column url type text')
};

exports.down = function(knex, Promise) {
  return knex.raw('alter table link_previews alter column url type character varying(255)')
};

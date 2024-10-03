
exports.up = function(knex, Promise) {
  return knex.raw(
    `CREATE INDEX location_center_idx ON locations USING GIST (center);`
  )
};

exports.down = function(knex, Promise) {
  return knex.raw(
    `DROP INDEX location_center_idx;`
  )
};

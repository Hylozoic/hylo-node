
exports.up = function(knex, Promise) {
  return knex.schema.createTable('locations', table => {
    table.increments().primary()

    table.specificType('center', 'geometry(point, 4326)');
    table.specificType('bbox', 'geometry(polygon, 4326)');
    table.specificType('geometry', 'geometry(polygon, 4326)');

    table.string('full_text')
    table.string('address_number')
    table.string('address_street')
    table.string('city')
    table.string('locality')
    table.string('region')
    table.string('neighborhood')
    table.string('postcode')
    table.string('country')

    table.string('accuracy')
    table.string('wikidata')

    table.timestamp('created_at')
    table.timestamp('updated_at')
  })
}

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('locations')
}

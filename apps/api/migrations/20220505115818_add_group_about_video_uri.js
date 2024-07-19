exports.up = function(knex) {
  return knex.schema.table('groups', table => {
    table.string('about_video_uri')
  })
}

exports.down = function(knex) {
  return knex.schema.table('groups', table => {
    table.dropColumn('about_video_uri')
  })
  
}


exports.up = async function (knex) {
  await knex.raw(`insert into tags (name) values ('general') ON CONFLICT DO NOTHING`)
}

exports.down = function (knex) {
  
}

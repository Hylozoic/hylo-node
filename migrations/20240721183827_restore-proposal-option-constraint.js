
exports.up = async function(knex) {
  await knex.raw('alter table proposal_options DROP CONSTRAINT IF EXISTS proposal_options_post_id_foreign')
  await knex.raw('alter table proposal_options ADD CONSTRAINT proposal_options_post_id_foreign FOREIGN KEY (post_id) REFERENCES posts(id) DEFERRABLE INITIALLY DEFERRED')
}

exports.down = async function(knex) {
}

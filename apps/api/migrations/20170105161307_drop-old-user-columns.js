
exports.up = function(knex, Promise) {
  return knex.schema.table('users', t => {
    t.dropColumn('push_follow_preference')
    t.dropColumn('push_new_post_preference')
    t.dropColumn('send_email_preference')
  })
};

exports.down = function(knex, Promise) {

};

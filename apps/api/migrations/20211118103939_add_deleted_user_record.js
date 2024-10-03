
exports.up = function (knex) { // this is no longer used
  return knex.raw(`
    INSERT INTO users(email, first_name, last_name, active, email_validated, bio)
    VALUES ('deleted@hylo.com', 'Deleted', 'User', false, true, 'This is the generic "deleted user" account');
  `)
}

exports.down = function (knex) {
  return knex.raw(`
    DELETE from users
    WHERE email = 'deleted@hylo.com';
  `)
}

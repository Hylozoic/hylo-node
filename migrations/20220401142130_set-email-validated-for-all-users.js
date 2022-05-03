
exports.up = async function(knex) {
  await knex.raw('UPDATE users SET email_validated = true')
};

exports.down = function(knex) {
  
};

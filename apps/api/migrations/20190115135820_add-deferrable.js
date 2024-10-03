
exports.up = function(knex, Promise) {
  return knex.raw('alter table activities alter constraint activities_project_contribution_id_foreign deferrable initially deferred')
  .then(() => knex.raw('alter table project_contributions alter constraint project_contributions_post_id_foreign deferrable initially deferred'))
  .then(() => knex.raw('alter table project_contributions alter constraint project_contributions_user_id_foreign deferrable initially deferred'))  
};

exports.down = function(knex, Promise) {
  
};

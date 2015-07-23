'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.table('users', table =>
    table.dropColumns('profile_tour', 'community_tour', 'finished_onboarding', 'credit_card_last4',
      'balanced_customer_id', 'billy_customer_id', 'balanced_card_id'));
};

exports.down = function(knex, Promise) {

};

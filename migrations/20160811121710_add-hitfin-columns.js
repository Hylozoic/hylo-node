'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.table('financial_request', table => {
    table.bigInteger('project_issue_id')
    table.bigInteger('project_offer_id')
    table.bigInteger('syndicate_issue_id')
    table.bigInteger('syndicate_offer_id')
  })
};

exports.down = function(knex, Promise) {
  return knex.schema.table('financial_request', table => {
    table.dropColumns('project_issue_id')
    table.dropColumns('project_offer_id')
    table.dropColumns('syndicate_issue_id')
    table.dropColumns('syndicate_offer_id')
  })
};

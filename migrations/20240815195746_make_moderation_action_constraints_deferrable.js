
exports.up = async function (knex) {
  await knex.raw('ALTER TABLE ONLY public.moderation_actions_agreements ALTER CONSTRAINT moderation_actions_agreements_moderation_action_id_foreign DEFERRABLE INITIALLY DEFERRED;')
  await knex.raw('ALTER TABLE ONLY public.moderation_actions_agreements ALTER CONSTRAINT moderation_actions_agreements_agreement_id_foreign DEFERRABLE INITIALLY DEFERRED;')
  await knex.raw('ALTER TABLE ONLY public.groups_agreements ALTER CONSTRAINT groups_agreements_agreement_id_foreign DEFERRABLE INITIALLY DEFERRED;')
  await knex.raw('ALTER TABLE ONLY public.groups_agreements ALTER CONSTRAINT groups_agreements_group_id_foreign DEFERRABLE INITIALLY DEFERRED;')
}

exports.down = function (knex) {

}

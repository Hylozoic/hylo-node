exports.up = function (knex) {
  return knex.schema.hasTable("oidc_payloads").then(async b => {
    if (!b)
      await knex.schema.createTable("oidc_payloads", t => {
        t.string("id");
        t.string("type");
        t.jsonb("payload");
        t.string("grant_id");
        t.string("user_code");
        t.string("uid");
        t.dateTime("expires_at");
        t.dateTime("consumed_at");
        t.primary(["id", "type"]);
      });
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable("oidc_payloads");
};

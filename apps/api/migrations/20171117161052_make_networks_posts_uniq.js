exports.up = knex =>
  knex.raw('ALTER TABLE networks_posts ADD CONSTRAINT network_id_post_id_key UNIQUE (network_id, post_id)')

exports.down = knex =>
  knex.raw('ALTER TABLE networks_posts DROP CONSTRAINT  network_id_post_id_key')

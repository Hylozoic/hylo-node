exports.up = knex => knex.raw('ALTER TABLE posts ALTER COLUMN link_preview_id TYPE bigint')
exports.down = knex => knex.raw('ALTER TABLE posts ALTER COLUMN link_preview_id TYPE integer')
